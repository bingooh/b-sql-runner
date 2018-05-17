import {Connection, getConnection} from "./connection";
import {DeleteSqlRunner, InsertSqlRunner, SelectSqlRunner, SqlRunner, UpdateSqlRunner} from "./sql-runner";
import {SelectFieldsParam, TableEntity} from "../model/stmt-model";

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

    async findMany():Promise<Array<T>>{
        return this.select().findMany();
    }

    async findOne(id:number|string):Promise<T|undefined>{
        return this.select().findOne(id);
    }

    async findFirst():Promise<T|undefined>{
        return this.select().findFirst();
    }

    async findTotal():Promise<number>{
        return this.select().findTotal();
    }

    async findExists(id?:number|string):Promise<boolean>{
        return this.select().findExists(id);
    }

    async findWithTotal():Promise<{data:Array<T>,total:number}>{
        return this.select().findWithTotal();
    }

    insert(rows?:object|Array<object>):InsertSqlRunner<T>{
        return this.sqlRunner<T>().insert(rows).into(this.table);
    }

    update(rows?:object|Array<object>):UpdateSqlRunner<T>{
        return this.sqlRunner<T>().update(rows).table(this.table);
    }

    async save(rows?:object|Array<object>):
        Promise<number|string|T|Array<T>|undefined>{
        return this.update(rows).save();
    }

    delete(rows?:object|Array<object>):DeleteSqlRunner<T>{
        return this.sqlRunner<T>().delete(rows).from(this.table);
    }

    async clear():Promise<number>{
        return this.delete().clear();
    }

    async truncate(tx?:any):Promise<any>{
        return this.sqlRunner<T>().truncate(this.table.name,tx);
    };


}