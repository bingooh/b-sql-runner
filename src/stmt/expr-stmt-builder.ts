import {
    ExprStmtEntity,
    LOGIC,
    LogicStmtEntity,
    KEY,
    StmtBuilder,
    RawStmtEntity,
    CondStmtEntity, Condition, OPER, WhereCondsParam
} from "../model/stmt-model";
import {CondStmtBuilder, nin} from "./cond-stmt-builder";
import {idArray, isCondStmtEntity, isExprStmtEntity, isStmtBuilder, toStmts} from "../common/util";
import {RawStmtBuilder} from "./raw-stmt-builder";

export class ExprStmtBuilder implements StmtBuilder<ExprStmtEntity>{
    protected stmt:ExprStmtEntity;

    constructor(){
        this.stmt=<ExprStmtEntity>Object.assign([],{$type:KEY.EXPR});
    }

    private pushToStmts(logic:LOGIC, conds:WhereCondsParam){
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