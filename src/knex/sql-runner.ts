import {
    count,
    DeleteStmtBuilder,
    eq,
    expr,
    idIn,
    InsertStmtBuilder,
    QueryStmtBuilder,
    raw,
    SelectStmtBuilder, truncate,
    UpdateStmtBuilder
} from "..";
import {
    DeleteStmtEntity,
    InsertStmtEntity,
    QueryStmtEntity,
    SelectFieldsParam,
    SelectStmtEntity,
    TableEntity,
    UpdateStmtEntity
} from "../model/stmt-model";
import {Connection} from "./connection";
import {SqlBuilder} from "./sql-builder";
import {isArray} from "util";
import {idArray, isEmpty} from "../common/util";
import {alwaysTrue} from "../stmt/cond-stmt-builder";
import {Transaction} from "knex";


/*mysql仅返回第1条新增记录的ID，此方法检查新增记录rows的长度，与新增记录后返回的id数组的长度是否相同*/
function checkCanReturningAllRows(ids:Array<any>,freshRowsSize:number,returning?:SelectStmtEntity){
    if(returning==undefined
        ||returning.where!=undefined
        ||ids.length==freshRowsSize)return;

    console.warn("Warn: database did not return all insert row's id, this will lead to 'returning' can not find all insert rows");
}

function getPk(stmt:QueryStmtEntity):string{
    let pk=stmt.table.pk;
    if(pk!=undefined)return pk;

    throw new Error("stmt.table.pk not exists");
}

function buildQuery(stmt:QueryStmtEntity,conn:Connection,printSql?:boolean){
    return SqlBuilder.buildQuery(stmt,conn.driver,printSql);
}

function buildReturningQuery(stmt:SelectStmtEntity,conn:Connection, ids?:any){
    if(stmt.where==undefined&&
        !isEmpty(ids))resetToWhereIdIn(stmt,ids);

    return buildQuery(stmt,conn);
}

function resetToWhereIdIn(stmt:SelectStmtEntity|UpdateStmtEntity|DeleteStmtEntity,ids:any){
    stmt.where=expr().and(idIn(ids,getPk(stmt))).toStmt();
    return stmt;
}

export class SelectSqlRunner<T> extends SelectStmtBuilder{
    constructor(private connection:Connection,table?:TableEntity){
        super(table);
    }

    private firstRow(rows:Array<T>):T|undefined{
        return rows&&rows.length>0?rows[0]:undefined;
    }

    private buildQuery(stmt:QueryStmtEntity){
        return buildQuery(stmt,this.connection);
    }

    async findMany():Promise<Array<T>>{
        return await this.buildQuery(this.toStmt());
    }

    async findOne(id:number|string):Promise<T|undefined>{
        let stmt=resetToWhereIdIn(this.toStmt(),id);
        let rows=await this.buildQuery(stmt);

        return this.firstRow(rows);
    }

    async findFirst(limit:number=1):Promise<T|undefined>{
        let stmt=this.limit(limit).toStmt();
        let rows=await this.buildQuery(stmt);

        return this.firstRow(rows);
    }

    async findTotal():Promise<number>{
        let stmt=this.toStmt();
        stmt.select=[count("*").as("total").toStmt()];
        stmt.limit=stmt.offset=0;

        let row=this.firstRow(await this.buildQuery(stmt));
        if(row==undefined)return 0;

        let total=parseInt((<any>row).total);
        return isNaN(total)?0:total;
    }

    async findExists(id?:number|string):Promise<boolean>{
        let stmt=this.limit(1).toStmt();
        stmt.select=[raw("?",[1]).toStmt()];
        stmt=id==undefined?stmt:resetToWhereIdIn(stmt,id);

        let row=this.firstRow(await this.buildQuery(stmt));
        return row!=undefined;
    }

    async findWithTotal():Promise<{data:Array<T>,total:number}>{
        let [data,total]=await Promise.all([
            this.findMany(),
            this.findTotal()
        ]);

        return {data,total};
    }
}

export class InsertSqlRunner<T> extends InsertStmtBuilder{
    constructor(private connection:Connection,table?:TableEntity){
        super(table);
    }

    private buildQuery(stmt:QueryStmtEntity){
        return buildQuery(stmt,this.connection);
    }

    private buildReturningQuery(stmt:SelectStmtEntity,ids?:any){
        return buildReturningQuery(stmt,this.connection,ids);
    }

    /*
    * 如果未设置'returning'
    * - 如果rows为object，则返回此新增记录ID，可能为空
    * - 如果rows为array，则返回受影响的行数
    *
    * 如果有设置'returning'
    * - 如果rows为object，则返回1条returning查询的记录
    * - 如果rows为array，则返回所有returning查询的记录
    * */
    async run(): Promise<number|string|T|Array<T>|undefined>{
        let stmt:InsertStmtEntity=this.toStmt();
        let {tx,returning,rows}=stmt;
        let rowsSize=isArray(rows)?rows.length:1;

        if(returning==undefined){
            /*返回结果可能为[id]或[]，具体注释见buildInsertSql()*/
            let ids:Array<number|string>=await this.buildQuery(stmt);

            if(isArray(rows))return rowsSize;
            if(ids.length==1)return ids[0];

            throw new Error("insert() no id return.  if your db is not mysql, you should set table.pk");
        }

        /*因为要执行returning语句，需要使用同1事务，
         *如果是新建事务，则需要在执行完毕后提交*/
        return await this.connection.runInTx(async (tx)=>{
            stmt.tx=tx;
            returning!.tx=tx;

            let ids=await this.buildQuery(stmt);
            checkCanReturningAllRows(ids,rowsSize,returning);

            let rs=await this.buildReturningQuery(returning!,ids);
            return isArray(rows)?rs:rs[0];
        },tx);
    }

}

export class UpdateSqlRunner<T> extends UpdateStmtBuilder{
    constructor(private connection:Connection,table?:TableEntity){
        super(table);
    }

    private buildQuery(stmt:QueryStmtEntity){
        return buildQuery(stmt,this.connection);
    }

    private buildReturningQuery(stmt:SelectStmtEntity,ids?:any){
        return buildReturningQuery(stmt,this.connection,ids);
    }

    private async updateBySets(stmt:UpdateStmtEntity):
        Promise<number|string|T|Array<T>|undefined>{
        let {tx,table,where,returning}=stmt;

        if(returning==undefined)
            return await this.buildQuery(stmt);

        /*查询受影响行的ID*/
        let pk=getPk(stmt);
        let builder=new SelectStmtBuilder();
        let findAffectedRowStmt=builder
            .field(pk).from(table)
            .inTx(tx).forUpdate().toStmt();
        findAffectedRowStmt.where=where;

        let affectedRows=await this.buildQuery(findAffectedRowStmt);
        if(affectedRows.length==0)return [];

        await this.buildQuery(stmt);
        return await this.buildReturningQuery(returning,affectedRows);
    }


    private async updateByRows(stmt:UpdateStmtEntity):
        Promise<number|string|T|Array<T>|undefined>{
        let pk=getPk(stmt);
        let {rows,returning}=stmt;

        /*保存修改记录*/
        let qs=this.buildQuery(stmt);
        await Promise.all(isArray(qs)?qs:[qs]);

        if(returning==undefined)
            return isArray(rows)?rows.length:1;

        let rs=await this.buildReturningQuery(returning,idArray(rows,pk));
        return isArray(rows)?rs:rs[0];
    }

    private async saveByRows(stmt:UpdateStmtEntity):
        Promise<number|string|T|Array<T>|undefined>{
        let pk=getPk(stmt);
        let {tx,table,rows,fields,returning}=stmt;
        let arrayRows=isArray(rows)?rows:[rows];
        let pickFields=fields==undefined?[]:fields;

        let freshRows=[];
        let dirtyRows=[];
        for(let row of arrayRows){
            if(row&&(row as any)[pk]!=undefined)
                dirtyRows.push(row);
            else
                freshRows.push(row);
        }

        /*从数据库查询对应id的记录是否存在，如存在才是真正的脏数据*/
        if(dirtyRows.length>0){
            let builder=new SelectStmtBuilder();
            let stmt=builder
                .field(pk).from(table)
                .where(idIn(dirtyRows))
                .inTx(tx).forUpdate().toStmt();

            let existRows=await this.buildQuery(stmt);
            if(existRows.length!=dirtyRows.length){
                let actualDirtyRows=[];
                let existsIds=idArray(existRows,pk);
                for(let row of dirtyRows){
                    let id=(row as any)[pk]+'';
                    if(existsIds.indexOf(id)!=-1)
                        actualDirtyRows.push(row);
                    else
                        freshRows.push(row);
                }

                dirtyRows=actualDirtyRows;
            }
        }

        let affectedIds=[];
        let freshRowsSize=freshRows.length;
        let dirtyRowsSize=dirtyRows.length;

        /*保存新增记录*/
        if(freshRowsSize>0){
            let builder=new InsertStmtBuilder();
            builder.into(table)
                .fields(...pickFields)
                .values(freshRows).inTx(tx);

            let ids=await this.buildQuery(builder.toStmt());
            affectedIds.push(...ids);

            checkCanReturningAllRows(ids,freshRowsSize,returning);
        }

        /*保存修改记录*/
        if(dirtyRowsSize>0){
            let builder=new UpdateStmtBuilder();
            builder.table(table)
                .fields(...pickFields)
                .values(dirtyRows).inTx(tx);

            let qs=this.buildQuery(builder.toStmt());
            await Promise.all(isArray(qs)?qs:[qs]);

            affectedIds.push(...idArray(dirtyRows,pk));
        }

        if(returning==undefined)
            return arrayRows.length;

        let rs=await this.buildReturningQuery(returning,affectedIds);
        return isArray(rows)?rs:rs[0];
    }

    async save(): Promise<number|string|T|Array<T>|undefined>{
        let stmt:UpdateStmtEntity=this.toStmt();
        let {rows,tx,returning}=stmt;

        if(rows==undefined||isEmpty(rows))
            throw new Error("save() rows is empty");

        let rowsSize=isArray(rows)?rows.length:1;
        if(tx!=undefined||
            returning==undefined&&rowsSize<=1)
            return await this.saveByRows(stmt);

        return await this.connection.runInTx(async (tx)=>{
            stmt.tx=tx;
            if(returning!=undefined) returning.tx=tx;

            return await this.saveByRows(stmt);
        },tx);
    }

    /*
    * 如果未设置'returning'，则返回受影响的行数
    *
    * 如果有设置'returning'
    * - 如果根据sets更新， 则返回所有returning查询的记录
    * - 如果rows为object，则返回1条returning查询的记录
    * - 如果rows为array，  则返回所有returning查询的记录
    * */
    async run(): Promise<number|string|T|Array<T>|undefined>{
        let stmt:UpdateStmtEntity=this.toStmt();
        let {sets,rows,tx,returning}=stmt;
        let isUpdateBySets=!isEmpty(sets);
        let rowsSize=isArray(rows)?rows.length:1;

        if(tx!=undefined||returning==undefined&&rowsSize<=1)
            return await isUpdateBySets?
                this.updateBySets(stmt):this.updateByRows(stmt);

        return await this.connection.runInTx(async (tx)=>{
            stmt.tx=tx;
            if(returning!=undefined) returning.tx=tx;

            return await isUpdateBySets?
                this.updateBySets(stmt):this.updateByRows(stmt);
        },tx);
    }

}

export class DeleteSqlRunner<T> extends DeleteStmtBuilder{
    constructor(private connection:Connection,table?:TableEntity){
        super(table);
    }

    private buildQuery(stmt:QueryStmtEntity){
        return buildQuery(stmt,this.connection);
    }

    /*
    * 如果未设置'returning'，则返回受影响的行数
    * 如果有设置'returning'，则返回所有returning查询的记录
    * */
    async run():Promise<number|Array<T>> {
        let stmt: DeleteStmtEntity = this.toStmt();
        let {tx, returning,where} = stmt;

        if (returning == undefined)
            return await this.buildQuery(stmt);

        return await this.connection.runInTx(async (tx)=>{
            stmt.tx=tx;
            returning!.tx=tx;
            returning!.forUpdate=true;
            returning!.where=returning!.where||where;

            /*如果rows不为空，考虑根据id删除可能效率更高*/
            let rows=await this.buildQuery(returning!);
            if(rows.length>0) await this.buildQuery(stmt);

            return rows;
        },tx);
    }

    /*删除所有记录，返回收影响的行数*/
    async clear(tx?:Transaction):Promise<number>{
        let stmt=this.inTx(tx).toStmt();

        stmt.returning=undefined;
        stmt.where=expr(alwaysTrue()).toStmt();

        return await this.buildQuery(stmt);
    }
}

export class SqlRunner<T>{
    constructor(private connection:Connection,private table?:TableEntity){}

    select(...fields:SelectFieldsParam):SelectSqlRunner<T>{
        return new SelectSqlRunner<T>(this.connection,this.table).field(...fields);
    }

    insert(rows?:object|Array<object>):InsertSqlRunner<T>{
        let r=new InsertSqlRunner<T>(this.connection,this.table);
        return rows==undefined?r:r.values(rows);
    }

    update(rows?:object|Array<object>):UpdateSqlRunner<T>{
        let r=new UpdateSqlRunner<T>(this.connection,this.table);
        return rows==undefined?r:r.values(rows);
    }

    delete(rows?:object|Array<object>):DeleteSqlRunner<T>{
        let r=new DeleteSqlRunner<T>(this.connection,this.table);
        return rows==undefined?r:r.values(rows);
    }

    async truncate(table:string,tx?:any):Promise<any>{
        let stmt=truncate(table,tx).toStmt();
        return await buildQuery(stmt,this.connection);
    };
}