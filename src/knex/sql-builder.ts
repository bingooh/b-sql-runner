import * as Knex from "knex";
import {QueryBuilder, WhereExists} from "knex";

import {
    CondStmtEntity,
    DeleteStmtEntity,
    ExprStmtEntity,
    FieldStmtEntity,
    FUNC,
    InsertStmtEntity,
    KEY,
    LOGIC,
    OPER,
    OrderByStmtEntity,
    QueryStmtEntity,
    RawStmtEntity,
    SelectStmtEntity,
    UpdateStmtEntity
} from "../model/stmt-model";
import {FuncStmtBuilder, raw} from "..";
import {
    idArray,
    isCondStmtEntity,
    isEmpty,
    isExprStmtEntity,
    isRawStmtEntity,
    isSelectStmtEntity,
    isString,
    pickBatch
} from "../common/util";
import {isArray} from "util";

const SIMPLE_OPER_MAPPING:{[k:number]:string}={
    [OPER.EQ]:'=',
    [OPER.NEQ]:'!=',
    [OPER.GT]:'>',
    [OPER.GTE]:'>=',
    [OPER.LT]:'<',
    [OPER.LTE]:'<=',
    [OPER.LIKE]:'like',
    [OPER.NLIKE]:'not like'
}

export interface SqlHandler {
    (stmt:any,
     query?:QueryBuilder,
     db?:Knex):any;
}

export class SqlBuilder{
    private readonly query:QueryBuilder;

    private static handlers:{[k:string]:SqlHandler}={};
    private static option:any={
        enablePrintSql:true,
        limit:10,
        offset:0
    }

    static config(option:any){
        this.option=Object.assign(this.option,option);
    }

    static registerSqlHandler(key:KEY, handler:SqlHandler){
        this.handlers[key]=handler;
    }

    static getSqlHandler(key:KEY):SqlHandler{
        let handler= this.handlers[key];

        if(handler==undefined)
            throw new Error(`Can't find SqlHandler for '${KEY[key]||key}'`);

        return handler;
    }

    private static preprocessExprStmt(stmts:any,pk?:string):void{
        if(!isExprStmtEntity(stmts))return;

        for(let stmt of stmts){
            let cond=stmt.cond;

            if(isExprStmtEntity(cond)){
                this.preprocessExprStmt(cond,pk);
            }else if(isCondStmtEntity(cond)){
                let {op,field,value}=cond;


                if(op==OPER.ID_IN||op==OPER.ID_NOT_ID){
                    field=field||pk;

                    if(!field||!isString(field))
                        throw new Error("idIn()/idNotIn() have to set 'table.pk' or 'idField'");

                    op=op==OPER.ID_IN?OPER.IN:OPER.NIN;
                    value=idArray(value,field);
                    Object.assign(cond,{op,field,value});
                }

                if((op==OPER.IN||op==OPER.NIN)&&
                    isArray(value)&&value.length==1){

                    op=op==OPER.IN?OPER.EQ:OPER.NEQ;
                    Object.assign(cond,{op,value:value[0]});
                }
            }
        }
    }

    private static preprocessQueryStmt(stmt:QueryStmtEntity){
        let pk=stmt.table.pk;
        let {where,having}=<any>stmt;

        this.preprocessExprStmt(where,pk);
        this.preprocessExprStmt(having,pk);

        return stmt;
    }

    /*db可以为Knex|Transaction，Knex.QueryBuilder实例===Knex("table")*/
    static buildQuery(stmt:QueryStmtEntity,db?:Knex,enablePrintSql?:boolean):
        QueryBuilder|Array<QueryBuilder>{
        db=stmt.tx||db;
        if(db==undefined)
            throw new Error("stmt.tx or db is null");

        stmt=this.preprocessQueryStmt(stmt);

        let q=db(stmt.table.name);
        let query=build(stmt,q,db);

        let printSql=enablePrintSql!=undefined?
            enablePrintSql:this.option.enablePrintSql;

        if(printSql) {
            let qs=isArray(query)?query:[query];
            qs.forEach(q=>console.log(q.toString()))
        }

        return query;
    }

    /*创建部分SQL语句，可能返回空*/
    public static build(stmt?:any, query?:QueryBuilder,
                 db?:Knex,key?:KEY):any{
        if(isEmpty(stmt))return;

        key=key||stmt.$type;
        if(key==undefined)return;

        return this.getSqlHandler(key)(stmt,query,db);
    }
}

const build:(stmt?:any,query?:QueryBuilder,
             db?:Knex,key?:KEY)=>any
    =SqlBuilder.build.bind(SqlBuilder);

const register:(key:KEY,handler:SqlHandler)=>void
    =SqlBuilder.registerSqlHandler.bind(SqlBuilder);

register(KEY.SELECT,buildSelectSql);
register(KEY.SELECT_FIELD,buildSelectFieldSql);
register(KEY.GROUP_BY,buildGroupBySql);
register(KEY.ORDER_BY,buildOrderBySql);
register(KEY.WHERE,buildWhereSql);
register(KEY.HAVING,buildHavingSql);
register(KEY.INSERT,buildInsertSql);
register(KEY.UPDATE,buildUpdateSql);
register(KEY.DELETE,buildDeleteSql);
register(KEY.TRUNCATE, buildTruncateSql);

function buildSelectSql(stmt:SelectStmtEntity,query:QueryBuilder,db:Knex){
    let {table,select,where,having,
        groupBy,orderBy,limit,offset,
        forShare,forUpdate}=stmt;

    query.as(table.as||"");//仅用于子查询
    if(limit&&limit>0)query.limit(limit);//暂不设置默认值
    if(offset&&offset>-1)query.offset(offset);
    if(forShare)query.forShare();
    if(forUpdate)query.forUpdate();

    build(groupBy,query,db,KEY.GROUP_BY);
    build(orderBy,query,db,KEY.ORDER_BY);
    build(select,query,db,KEY.SELECT_FIELD);
    build(where,query,db,KEY.WHERE);
    build(having,query,db,KEY.HAVING);

    return query;
}

function buildInsertSql(stmt:InsertStmtEntity,query:QueryBuilder,db:Knex){
    let {fields,rows,table}=stmt;

    let data=isArray(rows)?rows:[rows];
    data=isEmpty(fields)?
        data:pickBatch(data,fields);

    if(data.length==0)
        throw new Error("insert() rows is empty");

    /*
    * mysql不支持returning，执行insert后返回[id](仅包含第1条新增记录的ID)
    * pgsql等支持returning，如果不设置returning则执行insert后返回[]
    * */
    if(table.pk)query.returning(table.pk);

    return query.insert(data);
}

function buildUpdateSql(stmt:UpdateStmtEntity,query:QueryBuilder,db:Knex) {
    let {sets,rows}=stmt;
    if(!isEmpty(sets))return buildUpdateBySetsSql(stmt,query,db);
    if(!isEmpty(rows))return buildUpdateByRowsSql(stmt,query,db);

    throw new Error("update() sets and rows is all empty");
}

function buildUpdateBySetsSql(stmt:UpdateStmtEntity,query:QueryBuilder,db:Knex) {
    let {sets, where} = stmt;

    for (let k in sets!) {
        let v = sets![k];
        sets![k] = isRawStmtEntity(v) ? db.raw(v.expr, v.params) : v;
    }

    build(where, query, db,KEY.WHERE);
    return query.update(sets);
}

/*返回query数组*/
function buildUpdateByRowsSql(stmt:UpdateStmtEntity,query:QueryBuilder,db:Knex) {
    let {table,fields,rows}=stmt;

    let pk=table.pk;
    if(!pk) throw new Error("update() table.pk is empty");

    let data=isArray(rows)?rows:[rows];
    data=isEmpty(fields)?
        data:pickBatch(data,fields);

    if(data.length==0)
        throw new Error("update() rows is empty");

    return data.map(row=>{
        let id=(row as any)[pk!];
        if(!id)throw new Error(`update() row's pk value is empty: ${JSON.stringify(row)}`);

        /*TODO: omit row's pk*/
        return db(table.name).update(row).where(pk!,'=',id);
    });
}

function buildDeleteSql(stmt:DeleteStmtEntity,query:QueryBuilder,db:Knex){
    let {where}=stmt;
    if(isEmpty(where))
        throw new Error("delete() where is empty");

    build(where,query,db,KEY.WHERE);

    return query.del();
}

function buildGroupBySql(stmt:Array<string>,query:QueryBuilder){
    query.groupBy(...stmt);
}

function buildOrderBySql(stmts:Array<OrderByStmtEntity>,query:QueryBuilder){
    stmts.forEach(stmt=>{
        let order=stmt.desc?"desc":"asc";
        stmt.fields.forEach(field=>query.orderBy(field,order));
    });
}

function buildSelectFieldSql(stmts:Array<string|FieldStmtEntity|RawStmtEntity>,query:QueryBuilder,db:Knex){
    stmts.forEach(stmt=>{
        if(isString(stmt))return query.select(stmt);
        if(isRawStmtEntity(stmt))return query.select(db.raw(stmt.expr,stmt.params));

        /*knex支持"{alias:field}"或"field as alias"方式设置列别名，但是前者调用max()等方法会报错，暂时使用后者*/
        let {field,as,fn,distinct}=stmt;
        field=as==undefined?field:`${field} as ${as}`;

        switch (fn){
            /*distinct应在所有field的前面，否则sql会有误*/
            case FUNC.DISTINCT:
                query.distinct(field);break;
            case FUNC.MAX:
                query.max(field);break;
            case FUNC.MIN:
                query.min(field);break;
            case FUNC.AVG:
                query.avg(field);break;
            case FUNC.COUNT:
                distinct?
                    query.countDistinct(field) :
                    query.count(field);break;
            default:
                query.select(field);
        }

        return;
    });
}

function buildWhereSql(stmts:ExprStmtEntity,query:QueryBuilder,db:Knex) {
    query.table
    buildExprSql(stmts,query,db);
}

function buildHavingSql(stmts:ExprStmtEntity,query:QueryBuilder,db:Knex) {
    /*knex不支持having({age:10})*/
    let stmt=stmts.find(stmt=>
        !isCondStmtEntity(stmt.cond)&&
        !isRawStmtEntity(stmt.cond));

    if(stmt!=undefined)
        throw new Error("having() only support build CondStmtEntity: "+JSON.stringify(stmt));

    buildExprSql(stmts,query,db,true);
}

function buildExprSql(stmts:ExprStmtEntity,query:QueryBuilder,db:Knex,forHaving?:boolean){
    for(let stmt of stmts){
        let {logic,cond}=stmt;
        let q=logic==LOGIC.OR?query.or:query;

        if(isExprStmtEntity(cond)){
            q.where(qb=>buildExprSql(<ExprStmtEntity>cond,qb,db));
        }else if(isCondStmtEntity(cond)){
            buildCondSql(cond,q,db,forHaving);
        }else if(isRawStmtEntity(cond)){
            buildRawCondSql(cond,query,db,forHaving);
        } else{
            q.where(cond);
        }
    }
}

function buildRawCondSql(stmt:RawStmtEntity,query:QueryBuilder,db:Knex,forHaving?:boolean){
    let {expr,params}=stmt;
    let fn=forHaving?query.havingRaw:query.whereRaw;
    fn.bind(query)(expr,params);
}

function buildCondSql(stmt:CondStmtEntity,query:QueryBuilder,db:Knex,forHaving?:boolean){
    /*field仅支持string，除非使用raw，否则knex不支持拼接类似where max(age)>10*/
    let {op,field,value}=stmt;

    let simpleOp=SIMPLE_OPER_MAPPING[op];
    if(simpleOp!=undefined){
        if(!isString(field))throw new Error("field is not string");
        if(value===undefined)throw new Error("value is undefined");

        forHaving?
            query.having(field,simpleOp,value):
            query.where(field,simpleOp,value);
    }else if(op==OPER.ISNULL||op==OPER.ISNOTNULL){
        if(!isString(field))throw new Error("field is not string");

        let expr=`?? is ${op==OPER.ISNULL?'':'not'} null`;
        buildRawCondSql(raw(expr,[field]).toStmt(),query,db,forHaving);
    }else if(op==OPER.EXISTS||op==OPER.NEXISTS){
        if(!isSelectStmtEntity(value))throw new Error("value is not SelectStmtEntity");

        let fn:WhereExists;
        fn=op==OPER.EXISTS?
            (forHaving?query.havingExists:query.whereExists) :
            (forHaving?query.havingNotExists:query.whereNotExists);

        fn=fn.bind(query);
        fn(q=>buildSelectSql(value,q.from(value.table.name),db));
    }else if(op==OPER.IN||op==OPER.NIN){
        if(!isString(field))throw new Error("field is not string");

        let isArrayValue=isArray(value);
        let isStmtValue=isSelectStmtEntity(value);
        let isForIn=op==OPER.IN;

        if(forHaving){
            if(!isArrayValue)throw new Error("having() value is not Array");
            isForIn?query.havingIn(field,value):query.havingNotIn(field,value);
        }else{
            let fn=isForIn?query.whereIn:query.whereNotIn;
            fn=fn.bind(query);

            if(isArrayValue)fn(field,value);
            else if(isStmtValue)fn(field,q=>buildSelectSql(value,q.from(value.table.name),db));
            else throw new Error("value is not Array or SelectStmtEntity");
        }
    }else if(op==OPER.TRUE||op==OPER.FALSE){
        let expr=`? ${op==OPER.TRUE?'=':'!='} ?`;
        buildRawCondSql(raw(expr,[1,1]).toStmt(),query,db,forHaving);
    }else {
        throw new Error(`Unsupport operator: ${op}`);
    }
}

function buildTruncateSql(stmt:QueryStmtEntity,query:QueryBuilder,db:Knex){
    return query.truncate();
}