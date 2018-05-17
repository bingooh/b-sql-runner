import {
    DeleteStmtEntity,
    InsertStmtEntity,
    KEY,
    QueryStmtEntity, SelectFieldsParam,
    SelectStmtEntity,
    StmtBuilder, TableEntity,
    UpdateStmtEntity, WhereCondsParam,
    WhereStmtEntity
} from "../model/stmt-model";
import {field, FieldStmtBuilder, FuncStmtBuilder} from "./field-stmt-builder";
import {isArray, isString, splitAndFlatStringArray, toStmts} from "../common/util";
import {OrderStmtBuilder} from "./order-stmt-builder";
import { ExprStmtBuilder} from "./expr-stmt-builder";
import {raw, RawStmtBuilder} from "./raw-stmt-builder";
import {idIn} from "./cond-stmt-builder";

const FIELD_RX=/(\w+)(\s+as\s+)(\w+)?/;//匹配表达式'age as a';

export  class QueryStmtBuilder<T extends QueryStmtEntity>
    implements StmtBuilder<T>{
    protected stmt:T;

    protected pushToStmts(
        field:"select"|"where"|"having"|"groupBy"|"orderBy"|"fields",
        builders:Array<any>){

        let stmt=this.stmt as any;
        let stmts=stmt[field]||(stmt[field]=[]);
        stmts.push(...toStmts(builders));

        return this;
    }

    protected resetTable(table:string|TableEntity,pk?:string,alias?:string){
        if(isString(table)){
            let t=this.stmt.table;

            t.name=table;
            if(pk)t.pk=pk;
            if(alias)t.as=alias;
        }else{
            this.stmt.table=table;
        }

        return this;
    }

    constructor($type:KEY, table?:TableEntity) {
        let t=table==undefined?{}:table;
        this.stmt= {$type,table:t} as T;
    }

    inTx(tx?:any){
        if(tx!=undefined) this.stmt.tx=tx;
        return this;
    }

    toStmt(): T {
        let t=this.stmt.table;
        if(!t||!t.name)throw new Error("table is null");

        return this.stmt;
    }

}

export class WhereStmtBuilder<T extends QueryStmtEntity>
    extends QueryStmtBuilder<T>{
    private enableBuildWhere:boolean=true;
    private exprStmtBuilder:ExprStmtBuilder=new ExprStmtBuilder();

    /*使用外部builder创建expr，此情况下此类相当于helper，不再创建expr*/
    protected resetExprStmtBuilder(builder:ExprStmtBuilder){
        this.enableBuildWhere=false;
        this.exprStmtBuilder=builder;
    }

    where(...conds:WhereCondsParam){
        this.exprStmtBuilder.and(...conds);
        return this;
    }

    and(...conds:WhereCondsParam){
        this.exprStmtBuilder.and(...conds);
        return this;
    }

    or(...conds:WhereCondsParam){
        this.exprStmtBuilder.or(...conds);
        return this;
    }

    toStmt(): T {
        super.toStmt();

        if(this.enableBuildWhere){
            let where=this.exprStmtBuilder.toStmt();
            if(where&&where.length>0)
                (<WhereStmtEntity>this.stmt).where=where;
        }

        return this.stmt;
    }
}

export class SelectStmtBuilder extends WhereStmtBuilder<SelectStmtEntity>{
    private whereBuilder:ExprStmtBuilder=new ExprStmtBuilder();
    private havingBuilder:ExprStmtBuilder=new ExprStmtBuilder();

    constructor(table?:TableEntity){
        super(KEY.SELECT,table);
    }

    field(...fields:SelectFieldsParam){
        let stmts:SelectFieldsParam=[];
        for(let fd of fields){
            if(fd==undefined||!isString(fd)){
                stmts.push(fd);
            }else{
                let splits=fd.includes(",")?fd.split(","):[fd];
                splits.forEach(f=>{
                    let rs=f.match(FIELD_RX);
                    let stmt=rs==undefined?f:field(rs[1]).as(rs[3]);
                    stmts.push(stmt);
                });
            }
        }

        return this.pushToStmts("select",stmts);
    }

    from(table:string|TableEntity,pk?:string,alias?:string){
        return this.resetTable(table,pk,alias);
    }

    where(...conds:WhereCondsParam){
        this.resetExprStmtBuilder(this.whereBuilder);
        return this.and(...conds);
    }

    having(...conds:WhereCondsParam){
        this.resetExprStmtBuilder(this.havingBuilder);
        return this.and(...conds);
    }

    groupBy(...fields:Array<string>){
        return this.pushToStmts("groupBy",splitAndFlatStringArray(fields));
    }

    orderBy(...orders:Array<OrderStmtBuilder|undefined>){
        return this.pushToStmts("orderBy",orders);
    }

    limit(n:number){
        this.stmt.limit=n;
        return this;
    }

    offset(n:number){
        this.stmt.offset=n;
        return this;
    }

    forShare(){
        this.stmt.forShare=true;
        return this;
    }

    forUpdate(){
        this.stmt.forUpdate=true;
        return this;
    }

    toStmt(): SelectStmtEntity {
        super.toStmt();

        let where=this.whereBuilder.toStmt();
        if(where&&where.length>0)this.stmt.where=where;

        let having=this.havingBuilder.toStmt();
        if(having&&having.length>0)this.stmt.having=having;

        return this.stmt;
    }
}

function buildReturning(this:InsertStmtBuilder|UpdateStmtBuilder|DeleteStmtBuilder,
                        fields:string|Array<string>, expr?:ExprStmtBuilder){
    let stmt:InsertStmtEntity|UpdateStmtEntity|DeleteStmtEntity=(this as any).stmt;
    let builder=new SelectStmtBuilder(stmt.table);

    fields=splitAndFlatStringArray(fields);
    stmt.returning=builder.field(...fields).toStmt();
    if(expr!=undefined)stmt.returning.where=expr.toStmt();

    return this;
}

export class InsertStmtBuilder extends QueryStmtBuilder<InsertStmtEntity>{
    constructor(table?:TableEntity){
        super(KEY.INSERT,table);
    }

    into(table:string|TableEntity,pk?:string){
        return this.resetTable(table,pk);
    }

    fields(...fields:Array<string>){
        return this.pushToStmts("fields",splitAndFlatStringArray(fields));
    }

    values(rows:object|Array<object>){
        this.stmt.rows=rows;
        return this;
    }

    returning(fields:string|Array<string>,expr?:ExprStmtBuilder):this{
        return buildReturning.call(this,fields,expr);
    }
}

export class UpdateStmtBuilder extends WhereStmtBuilder<UpdateStmtEntity>{
    constructor(table?:TableEntity){
        super(KEY.UPDATE,table);
    }

    table(table:string|TableEntity,pk?:string){
        return this.resetTable(table,pk);
    }

    fields(...fields:Array<string>){
        return this.pushToStmts("fields",splitAndFlatStringArray(fields));
    }

    returning(fields:string|Array<string>,expr?:ExprStmtBuilder):this{
        return buildReturning.call(this,fields,expr);
    }

    values(rows:object|Array<object>){
        this.stmt.sets=undefined;
        this.stmt.rows=rows;
        return this;
    }

    set(field: string, value: any):this;
    set(conds: {[field:string]:any}):this;
    set(a1:string|{[field:string]:any},a2?:any){
        this.stmt.rows=undefined;
        let sets:any=this.stmt.sets||(this.stmt.sets={});

        let conds:{[field:string]:any}=isString(a1)?{[a1]:a2}:a1;
        for(let field in conds){
            let v=conds[field];
            sets[field]=(v instanceof RawStmtBuilder)?v.toStmt():v;
        }

        return this;
    }

    incr(field:string,step:number=1){
        return this.set(field,raw('?? + ?',[field,step]));
    }

    decr(field:string,step:number=1){
        return this.set(field,raw('?? - ?',[field,step]));;
    }

    replace(field:string,byField:string){
        return this.set(field,raw('??',[byField]));
    }

}

export class DeleteStmtBuilder extends WhereStmtBuilder<DeleteStmtEntity>{
    constructor(table?:TableEntity){
        super(KEY.DELETE,table);
    }

    from(table:string|TableEntity,pk?:string){
        return this.resetTable(table,pk);
    }

    values(rows:any){
        return this.where(idIn(rows));
    }

    returning(fields:string|Array<string>,expr?:ExprStmtBuilder):this{
        return buildReturning.call(this,fields,expr);
    }
}

export function truncate(table:string,tx?:any){
    let tb:TableEntity={name:table};
    return new QueryStmtBuilder<QueryStmtEntity>(KEY.TRUNCATE,tb).inTx(tx);
}