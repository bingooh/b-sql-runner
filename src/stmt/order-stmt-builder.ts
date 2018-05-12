import {KEY, OrderByStmtEntity, StmtBuilder} from "../model/stmt-model";
import {splitAndFlatStringArray} from "../common/util";

export class OrderStmtBuilder implements StmtBuilder<OrderByStmtEntity>{
    protected stmt:OrderByStmtEntity
    constructor(fields:Array<string>,desc?:boolean){
        this.stmt={
            $type:KEY.ORDER_BY,
            fields:splitAndFlatStringArray(fields)
        };

        if(desc)this.stmt.desc=desc;
    }

    toStmt(): OrderByStmtEntity {
        return this.stmt;
    }
}

export function asc(...fields:Array<string>) {
    return new OrderStmtBuilder(fields);
}

export function desc(...fields:Array<string>) {
    return new OrderStmtBuilder(fields,true);
}