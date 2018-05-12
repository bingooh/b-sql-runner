import {DeleteStmtBuilder} from "../stmt/query-stmt-builder";
import {ExprStmtBuilder} from "../stmt/expr-stmt-builder";
import {RawStmtBuilder} from "../stmt/raw-stmt-builder";
import {CondStmtBuilder} from "../stmt/cond-stmt-builder";
import {FieldStmtBuilder, FuncStmtBuilder} from "../stmt/field-stmt-builder";

export enum LOGIC{AND=0,OR, NOT}

export enum OPER{
    EQ=100,NEQ,
    LT,LTE,GT,GTE,
    LIKE,NLIKE,
    IN,NIN,
    EXISTS,NEXISTS,
    ISNULL,ISNOTNULL,
    TRUE,FALSE,
    ID_IN,ID_NOT_ID
}

export enum FUNC{
    DISTINCT=200,
    COUNT, AVG,SUM,MIN,MAX
}

export enum KEY{
    SELECT=300,INSERT,UPDATE,DELETE,
    SELECT_FIELD, WHERE, HAVING,
    ORDER_BY,GROUP_BY,
    FIELD, COND,LOGIC,
    RAW, EXPR,
    TRUNCATE
}

export interface StmtBuilder<T> {
    toStmt():T;
}

export interface RawStmtEntity{
    $type:KEY.RAW;
    expr:string;
    params?:any;
}

export interface FieldStmtEntity{
    $type:KEY.FIELD;
    field:string;
    as?:string;
    fn?:FUNC;
    distinct?:boolean;
}

export interface CondStmtEntity{
    $type:KEY.COND;
    op:OPER;
    field?:string|FieldStmtEntity;
    value?:any;
}

export type Condition=RawStmtEntity|CondStmtEntity|ExprStmtEntity|object;

export interface LogicStmtEntity{
    $type:KEY.LOGIC;
    logic:LOGIC;
    cond:Condition;
}

export interface ExprStmtEntity extends Array<LogicStmtEntity>{
    $type:KEY.EXPR;
}

export interface TableEntity{
    name:string;
    pk?:string;
    as?:string;
}

export interface OrderByStmtEntity{
    $type:KEY.ORDER_BY;
    fields:Array<string>;
    desc?:boolean
}

export interface QueryStmtEntity {
    $type:KEY.SELECT | KEY.INSERT|
        KEY.UPDATE| KEY.DELETE|
        KEY.TRUNCATE;
    table:TableEntity;
    tx?:any;//数据库事务
}

export interface SelectStmtEntity extends QueryStmtEntity{
    select?:Array<string|FieldStmtEntity|RawStmtEntity>;
    where?:ExprStmtEntity;
    having?:ExprStmtEntity;
    groupBy?:Array<string>;
    orderBy?:Array<OrderByStmtEntity>;
    limit?:number;
    offset?:number;
    forShare?:boolean;
    forUpdate?:boolean;
}

export interface InsertStmtEntity extends QueryStmtEntity{
    fields?:Array<string>;
    rows?:object|Array<object>;
    returning?:SelectStmtEntity;
}

export interface UpdateStmtEntity extends QueryStmtEntity{
    sets?:{[k:string]:any};
    fields?:Array<string>;
    rows?:object|Array<object>;
    where?:ExprStmtEntity;
    returning?:SelectStmtEntity;
}

export interface DeleteStmtEntity extends QueryStmtEntity{
    where?:ExprStmtEntity;
    returning?:SelectStmtEntity;
}

export type WhereStmtEntity=
    SelectStmtEntity |
    UpdateStmtEntity |
    DeleteStmtBuilder;

export type WhereCondsParam=Array<RawStmtBuilder|CondStmtBuilder|ExprStmtBuilder|object|undefined>;
export type SelectFieldsParam=Array<string|FieldStmtBuilder|FuncStmtBuilder|RawStmtBuilder|undefined>;