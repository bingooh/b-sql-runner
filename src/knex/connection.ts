import * as Knex from "knex";
import {Config, Transaction} from "knex";
import {SqlRunner} from "./sql-runner";
import {Repository} from "./repository";
import {TableEntity} from "..";

export class ConnectionManager{
    private static conns:{[name:string]:Connection}={};

    static existsConnection(name:string="default"){
        return this.conns[name]!=undefined;
    }

    static getConnection(name:string="default"){
        if(!this.existsConnection(name))
            throw new Error(`connection '${name}' not exists`);

        return this.conns[name];
    }

    static createConnections(configs:{[name:string]:Config}){
        let names=Object.keys(configs);
        let existsConnNames=names.filter(name=>this.existsConnection(name));
        if(existsConnNames.length>0)
            throw new Error(`connection '${JSON.stringify(existsConnNames)}' exists, you have to close it first`);

        for(let name of names){
            this.conns[name]=new Connection(name,Knex(configs[name]));
        }
    }

    static createDefaultConnection(config:Config){
        this.createConnections({'default':config});
    }
}

export function getConnection(name:string='default') {
    return ConnectionManager.getConnection(name);
}

export function getRepository<T>(table:TableEntity,connection?:string):Repository<T>{
    return getConnection(connection).repository<T>(table);
}

export function getCustomRepository<U extends Repository<any>>(
    RepoClazz:new ()=>U,table?:TableEntity,connection?:string):U{
    return getConnection(connection).customRepository<U>(RepoClazz,table);
}

export class Connection{
    private _sqlRunner:SqlRunner<any>;

    constructor(public name:string,public driver:Knex){}

    private wrapTx(tx:Transaction){
        let tag=Math.floor(Math.random()*100000+1);
        let commit=tx.commit.bind(tx);
        let rollback=tx.rollback.bind(tx);

        console.log(`create tx: ${tag}`);

        tx.commit=(value?:any)=>{
            console.log(`commit tx : ${tag}`);
            return commit(value);
        }

        tx.rollback=(error?:any)=>{
            console.log(`rollback tx: ${tag}`)
            return rollback(error);
        }

        return tx;
    }

    /*创建事务，需要自行commit/rollback*/
    async createTx(){
        return new Promise<Transaction>(resolve=>{
           this.driver.transaction(tx=>resolve(this.wrapTx(tx)))
        });
    }

    /*如果参数tx不为空，则使用传入的tx，此情况下需要自行commit/rollback*/
    async runInTx<T>(cb:(tx:Transaction)=>Promise<T>,tx?:Transaction){
        if(tx)return await cb(tx);

        tx=await this.createTx();
        try{
            var rs=await cb(tx);
            tx.commit();
            return rs;
        }catch(e){
            tx.rollback();
            throw e;
        }
    }

    /*关闭整个连接池*/
    async close(){
        return this.driver.destroy();
    }

    sqlRunner<T>():SqlRunner<T>{
        this._sqlRunner=this._sqlRunner||new SqlRunner<any>(this);
        return this._sqlRunner;
    }

    repository<T>(table:TableEntity):Repository<T>{
        let r=new Repository<T>();
        r.useTable(table);
        r.useConnection(this);
        return r;
    }

    customRepository<U extends Repository<any>>(
        RepoClazz:new ()=>U,table?:TableEntity):U{
        let r=new RepoClazz();
        if(table!=undefined)r.useTable(table);
        r.useConnection(this);
        return r;
    }
}