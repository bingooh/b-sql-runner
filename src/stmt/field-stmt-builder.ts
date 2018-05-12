import {FieldStmtEntity, FUNC, KEY, StmtBuilder} from "../model/stmt-model";

export class FieldStmtBuilder implements StmtBuilder<FieldStmtEntity>{
    protected stmt:FieldStmtEntity;

    constructor(field:string,fn?:FUNC){
        this.stmt={$type:KEY.FIELD,field};
        if(fn)this.stmt.fn=fn;
    }

    as(alias:string){
        this.stmt.as=alias;
        return this;
    }

    toStmt(){return this.stmt}
}

export class FuncStmtBuilder extends FieldStmtBuilder{
    constructor(fn:FUNC,field?:string){
        super(field?field:'');
        this.stmt.fn=fn;
    }

    distinct(field:string){
        this.stmt.field=field;
        this.stmt.distinct=true;
        return this;
    }
}

export function field(fields:string){
    return new FieldStmtBuilder(fields);
}
export function distinct(field:string){
    return new FieldStmtBuilder(field,FUNC.DISTINCT);
}
export function count(field?:string){
    return new FuncStmtBuilder(FUNC.COUNT,field);
}
export function avg(field?:string){
    return new FuncStmtBuilder(FUNC.AVG,field);
}
export function sum(field?:string){
    return new FuncStmtBuilder(FUNC.SUM,field);
}
export function min(field?:string){
    return new FuncStmtBuilder(FUNC.MIN,field);
}
export function max(field?:string){
    return new FuncStmtBuilder(FUNC.MAX,field);
}