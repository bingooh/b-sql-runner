import {ExprStmtEntity, KEY, LOGIC, LogicStmtEntity, StmtBuilder, WhereCondsParam} from "../model/stmt-model";
import {isObject, isStmtBuilder, toStmts} from "../common/util";

export class ExprStmtBuilder implements StmtBuilder<ExprStmtEntity>{
    protected stmt:ExprStmtEntity;

    constructor(){
        this.stmt=<ExprStmtEntity>Object.assign([],{$type:KEY.EXPR});
    }

    private pushToStmts(logic:LOGIC, conds:WhereCondsParam){
        conds!=conds.map(cond=>{
            if(isStmtBuilder(cond))return cond;
            if(!isObject(cond))return cond;

            let empty=true;
            for(let prop in cond){
                if((cond as any)[prop]===undefined){
                    delete (cond as any)[prop];
                    continue;
                }

                empty=false;
            }

            return empty?undefined:cond;
        }).filter(cond=>cond!=undefined);

        let stmts=toStmts(conds)
            .map<LogicStmtEntity>(cond=>{
                return {$type:KEY.LOGIC,logic,cond}
            });

        this.stmt.push(...stmts);
        return this;
    }

    and(...conds:WhereCondsParam){
        return this.pushToStmts(LOGIC.AND, conds);
    }

    or(...conds:WhereCondsParam){
        return this.pushToStmts(LOGIC.OR, conds);
    }

    toStmt(): ExprStmtEntity {
        return this.stmt;
    }
}

export function expr(...conds:WhereCondsParam) {
    return new ExprStmtBuilder().and(...conds);
}