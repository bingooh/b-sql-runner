import {isStmtBuilder, isString} from "../common/util";
import {CondStmtEntity, OPER, KEY, StmtBuilder} from "../model/stmt-model";
import {FieldStmtBuilder} from "./field-stmt-builder";
import {SelectStmtBuilder} from "./query-stmt-builder";


export class CondStmtBuilder implements StmtBuilder<CondStmtEntity>{
    protected stmt:CondStmtEntity;

    constructor(op:OPER, field?:string|FieldStmtBuilder, value?:any) {
        this.stmt = {$type:KEY.COND,op};

        if (field) this.stmt.field =
            isString(field) ? field : field.toStmt();

        if(value!==undefined)
            this.stmt.value=isStmtBuilder(value)?value.toStmt():value;
    }

    toStmt(){return this.stmt}
}

export function eq(field:string|FieldStmtBuilder,value:any){
    return new CondStmtBuilder(OPER.EQ,field,value);
}
export function neq(field:string|FieldStmtBuilder,value:any){
    return new CondStmtBuilder(OPER.NEQ,field,value);
}
export function lt(field:string|FieldStmtBuilder,value:any){
    return new CondStmtBuilder(OPER.LT,field,value);
}
export function lte(field:string|FieldStmtBuilder,value:any){
    return new CondStmtBuilder(OPER.LTE,field,value);
}
export function gt(field:string|FieldStmtBuilder,value:any){
    return new CondStmtBuilder(OPER.GT,field,value);
}
export function gte(field:string|FieldStmtBuilder,value:any){
    return new CondStmtBuilder(OPER.GTE,field,value);
}
export function like(field:string,value:any){
    return new CondStmtBuilder(OPER.LIKE,field,value);
}
export function nlike(field:string,value:any){
    return new CondStmtBuilder(OPER.NLIKE,field,value);
}
export function isnull(field:string){
    return new CondStmtBuilder(OPER.ISNULL,field);
}
export function isnotnull(field:string){
    return new CondStmtBuilder(OPER.ISNOTNULL,field);
}
export function exists(value:SelectStmtBuilder){
    return new CondStmtBuilder(OPER.EXISTS,undefined,value);
}
export function nexists(value:SelectStmtBuilder){
    return new CondStmtBuilder(OPER.NEXISTS,undefined,value);
}
function ins(field:string,value:Array<any>|SelectStmtBuilder){
    return new CondStmtBuilder(OPER.IN,field,value);
}
export {ins as in};
export function nin(field:string,value:Array<any>|SelectStmtBuilder){
    return new CondStmtBuilder(OPER.NIN,field,value);
}
export function idIn(value:any,idField?:string){
    return new CondStmtBuilder(OPER.ID_IN,idField,value);
}
export function idNotIn(value:any,idField?:string){
    return new CondStmtBuilder(OPER.ID_NOT_ID,idField,value);
}
export function alwaysTrue(){
    return new CondStmtBuilder(OPER.TRUE);
}
export function alwaysFalse(){
    return new CondStmtBuilder(OPER.FALSE);
}