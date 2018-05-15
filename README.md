[b-sql-runner](https://github.com/bingooh/b-sql-runner)是一款简单的`sql query builder`，追求以最接近写SQL的方式来完成对数据的操作

b-sql-runner底层使用[knex](https://github.com/tgriesser/knex)执行SQL，后期可能使用其他库实现。**目前没有单元测试，请谨慎考虑在生产环境里使用！**

b-sql-runner参考了以下框架，在次致谢
- [knex](https://github.com/tgriesser/knex)
- [typeorm](https://github.com/typeorm/typeorm)
- [squel](https://github.com/hiddentao/squel)

欢迎提供PR，尤其欢迎提供单元测试PR，Have Fun！

## Feature
- **仅支持单表的增删改查**
- 动态SQL
- 事务
- 支持Typescript

## INSTALL
通过npm安装
```
npm install b-sql-runner -S
```

安装你使用的数据库驱动，如[mysql](https://github.com/mysqljs/mysql)
```
npm install mysql -S
```

如果你使用Typescript，推荐以下安装
```
npm install @types/knex -D
```

## Connection
创建数据库连接，knex将创建数据库连接池。建议总是创建默认数据库连接
```javascript
import {Config} from "knex";
import {ConnectionManager} from "b-sql-runner";

const dbConfig:Config={
    client: 'mysql',
    debug: false,
    //以下为node-mysql配置
    connection: {
        host: DB_HOST,
        port: DB_PORT,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME
    }
}

//创建默认数据库连接
ConnectionManager.createDefaultConnection(dbConfig)

//创建多个数据库连接
ConnectionManager.createConnections({
    'default':dbConfig,
    slaveDb:slaveDdConfig
})
```

获取数据库连接
```javascript
import {getConnection} from "b-sql-runner";

//获取默认数据库连接
const conn=getConnection();

//获取指定名称的数据库连接
const slaveDbConn=getConnection('slaveDb');
```

关闭数据库连接池
```javascript
const conn=getConnection();
await conn.close();
```

## SqlRunner
`SqlRunner`负责拼接并执行SQL

获取`SqlRunner`
```javascript
const sqlRunner=getConnection().sqlRunner();

//指定数据库记录的对象类型
interface User{
    oid:number;
    name:string;
}
const sqlRunner=getConnection().sqlRunner<User>();
```

### Select
简单查询
```javascript
//select `oid`, `realname` from `t_user` limit 1
let user=sqlRunner
    .select('oid,name')
    .from('t_user')
    .findFirst();
```



### Insert
```javascript

```

### Update
```javascript

```

### Delete
```javascript

```