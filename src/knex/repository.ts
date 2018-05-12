import {Connection, getConnection} from "./connection";
import {DeleteSqlRunner, InsertSqlRunner, SelectSqlRunner, SqlRunner, UpdateSqlRunner} from "./sql-runner";
import {SelectFieldsParam, TableEntity} from "../model/stmt-model";

export class Repository<T>{
    private static connection:Connection;

    /*子类应覆盖此属性或者调用useTable()以设置table，
     *后面可考虑使用decorator*/
    protected static table:TableEntity;

    static useTable(table:TableEntity){
        this.table=table;
    }

    static useConnection(connection:Connection){
        this.connection=connection;
    }

    static sqlRunner<T>():SqlRunner<T>{
        let conn=this.connection||getConnection();
        return conn.sqlRunner<T>();
    }

    static select<T>(...fields:SelectFieldsParam):SelectSqlRunner<T>{
        return this.sqlRunner<T>().select(...fields).from(this.table);
    }

    static async findMany<T>():Promise<Array<T>>{
        return this.select<T>().findMany();
    }

    static async findOne<T>(id:number|string):Promise<T|undefined>{
        return this.select<T>().findOne(id);
    }

    static async findFirst<T>():Promise<T|undefined>{
        return this.select<T>().findFirst();
    }

    static async findTotal<T>():Promise<number>{
        return this.select<T>().findTotal();
    }

    static async findExists<T>(id?:number|string):Promise<boolean>{
        return this.select<T>().findExists(id);
    }

    static async findWithTotal<T>():Promise<{data:Array<T>,total:number}>{
        return this.select<T>().findWithTotal();
    }

    static insert<T>(rows?:object|Array<object>):InsertSqlRunner<T>{
        return this.sqlRunner<T>().insert(rows).into(this.table);
    }

    static update<T>(rows?:object|Array<object>):UpdateSqlRunner<T>{
        return this.sqlRunner<T>().update(rows).table(this.table);
    }

    static async save<T>(rows?:object|Array<object>):
        Promise<number|string|T|Array<T>|undefined>{
        return this.update<T>(rows).save();
    }

    static delete<T>(rows?:object|Array<object>):DeleteSqlRunner<T>{
        return this.sqlRunner<T>().delete(rows).from(this.table);
    }

    static async clear<T>():Promise<number>{
        return this.delete().clear();
    }

    static async truncate<T>(tx?:any):Promise<any>{
        return this.sqlRunner<T>().truncate(this.table.name,tx);
    };


}