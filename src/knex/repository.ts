import {Connection, getConnection} from "./connection";
import {DeleteSqlRunner, InsertSqlRunner, SelectSqlRunner, SqlRunner, UpdateSqlRunner} from "./sql-runner";
import {SelectFieldsParam, TableEntity} from "../model/stmt-model";
import {Transaction} from "knex";

export class Repository<T>{
    protected connection:Connection;

    /*子类应覆盖此属性或者调用useTable()以设置table，
     *后面可考虑使用decorator*/
    protected table:TableEntity;

    useTable(table:TableEntity){
        this.table=table;
    }

    useConnection(connection:Connection){
        this.connection=connection;
    }

    sqlRunner<T>():SqlRunner<T>{
        let conn=this.connection||(this.connection=getConnection());
        return conn.sqlRunner<T>();
    }

    select(...fields:SelectFieldsParam):SelectSqlRunner<T>{
        return this.sqlRunner<T>().select(...fields).from(this.table);
    }

    async findMany(tx?:Transaction):Promise<Array<T>>{
        return this.select().inTx(tx).findMany();
    }

    async findOne(id:number|string,tx?:Transaction):Promise<T|undefined>{
        return this.select().inTx(tx).findOne(id);
    }

    async findFirst(limit:number=1,tx?:Transaction):Promise<T|undefined>{
        return this.select().inTx(tx).findFirst(limit);
    }

    async findTotal(tx?:Transaction):Promise<number>{
        return this.select().inTx(tx).findTotal();
    }

    async findExists(id?:number|string,tx?:Transaction):Promise<boolean>{
        return this.select().inTx(tx).findExists(id);
    }

    async findWithTotal(tx?:Transaction):Promise<{data:Array<T>,total:number}>{
        return this.select().inTx(tx).findWithTotal();
    }

    insert(rows?:object|Array<object>,tx?:Transaction):InsertSqlRunner<T>{
        return this.sqlRunner<T>().insert(rows).into(this.table).inTx(tx);
    }

    update(rows?:object|Array<object>,tx?:Transaction):UpdateSqlRunner<T>{
        return this.sqlRunner<T>().update(rows).table(this.table).inTx(tx);
    }

    async save(rows?:object|Array<object>,tx?:Transaction):
        Promise<number|string|T|Array<T>|undefined>{
        return this.update(rows).inTx(tx).save();
    }

    delete(rows?:object|Array<object>,tx?:Transaction):DeleteSqlRunner<T>{
        return this.sqlRunner<T>().delete(rows).from(this.table).inTx(tx);
    }

    async clear(tx?:Transaction):Promise<number>{
        return this.delete().clear(tx);
    }

    async truncate(tx?:any):Promise<any>{
        return this.sqlRunner<T>().truncate(this.table.name,tx);
    };


}