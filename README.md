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
`SqlRunner`负责拼接并执行SQL，以下获取`SqlRunner`
```javascript
const sqlRunner=getConnection().sqlRunner();

//可选指定数据库记录的对象类型
interface User{
    oid:number;
    name:string;
}
const sqlRunner=getConnection().sqlRunner<User>();


//获取`SqlRunner`实例后，还需要进一步获取具体的sql runner
let selectSqlRunner=sqlRunner.select();
```

`SqlRunner`实例提供以下方法获取对应的`sql runner`
- `select()` -获取`SelectSqlRunner`
- `insert()` -获取`InsertSqlRunner`
- `update()` -获取`UpdateSqlRunner`
- `delete()` -获取`DeleteSqlRunner`

### SELECT
`SelectSqlRunner`负责执行SELECT SQL

简单查询
```javascript
//select `oid`, `name` from `t_user` limit 1
let user=await sqlRunner
    .select('oid,name')
    .from('t_user')
    .findFirst();
```

指定查询字段
```javascript
//select `oid`, `name`
sqlRunner.select('oid,name');
sqlRunner.select().field('oid,name');
sqlRunner.select().field('oid','name');
sqlRunner.select().field('oid').field('name');

//select `oid` as `id`, `name` as `nickname`
sqlRunner.select('oid as id,name as nickname');
```

指定聚合函数查询字段
```javascript
import * as b from "b-sql-runner";

//select count(`oid`)
sqlRunner.select(b.count('oid'));

//select count(`oid`) as `count`
sqlRunner.select(b.count('oid').as('count'));

//select count(distinct `oid`)
sqlRunner.select(b.count().distinct('oid'));
```

指定简单查询条件
```javascript
//where `oid` = 1 and `name` != 'b'
sqlRunner.select()
    .where(b.eq('oid',1))
    .and(b.neq('name','bill'))

//where `oid` = 1 or `name` != 'b'
sqlRunner.select()
    .where(b.eq('oid',1))
    .or(b.neq('name','bill'))

// where `oid` = 100 and `name` = 'bill'
sqlRunner.select()
    .where({oid:100,name:'bill'})

// where `oid` = 100 or `name` = 'bill'
sqlRunner.select()
    .where()
    .or({oid:100,name:'bill'})
```

指定复杂查询条件，使用`expr()`
```
//where `oid` < 100 and (`oid` > 100 or `name` = 'bill')
sqlRunner.select()
        .where(b.lt('oid',100))
        .or(
            b.expr()
                .and(b.gt('oid',100))
                .and(b.eq('name','bill'))
        )
```



### INSERT
```javascript

```

### UPDATE
```javascript

```

### DELETE
```javascript

```