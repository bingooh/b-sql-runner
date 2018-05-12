import {RawStmtEntity, KEY, StmtBuilder} from "../model/stmt-model";

export class RawStmtBuilder implements StmtBuilder<RawStmtEntity>{
    protected stmt:RawStmtEntity;

    constructor(expr:string,params?:any){
        this.stmt={$type:KEY.RAW,expr};
        if(params)this.stmt.params=params;
    }

    toStmt(): RawStmtEntity {
        return this.stmt;
    }
}

export function raw(expr:string,params?:any){
    return new RawStmtBuilder(expr,params);
}