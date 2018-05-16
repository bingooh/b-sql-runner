[b-sql-runner](https://github.com/bingooh/b-sql-runner)是一款简单的`sql query builder`，追求以最接近写SQL的方式来完成对数据的操作

b-sql-runner底层使用[knex](https://github.com/tgriesser/knex)执行SQL，后期可能使用其他库实现。**目前没有单元测试，请谨慎考虑在生产环境里使用！** 欢迎提供PR，尤其欢迎提供单元测试PR，Have Fun！

b-sql-runner参考了以下框架，在次致谢！
- [knex](https://github.com/tgriesser/knex)
- [typeorm](https://github.com/typeorm/typeorm)
- [squel](https://github.com/hiddentao/squel)

文档快速指引
- [Connecton](#connection)
- [SqlRunner](#sqlrunner)
    - [SELECT](#select)
    - [INSRT](#insert)
    - [UPDATE](#update)
    - [DELETE](#delete)
- [Repository](#repository)
- [Transaction](#transaction)
- [Dynamic SQL](#dynamic-sql)
- [Raw Query](#raw-query)
- [Returning Query](#returinig-query)
- [API](#api)
    - [运算符](#运算符)
    - [聚合函数](#聚合函数)
    - [扩展运算符](#扩展运算符)
    - [ConnectionManager](#connectionmanager)
    - [Conneciton](#conneciton-1)
    - [SqlRunner](#sqlrunner-1)
    - [SelectSqlRunner](#selectsqlrunner)
    - [UpdateSqlRunner](#updatesqlrunner)
    - [DeleteSqlRunner](#deletedqlrunner)
    - [Other](#other)

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
创建数据库连接，建议总是创建默认数据库连接

knex将创建数据库连接池，以下为mysql的配置，其他数据库配置请参考knex
```javascript
import {Config} from "knex";
import {ConnectionManager} from "b-sql-runner";

//创建mysq数据库连接配置
const dbConfig:Config={
    client: 'mysql',
    debug: false,
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

// where `oid` = 100 and `name` = 'bill'
sqlRunner.select()
    .where(
        b.eq('oid',100),
        b.eq('name','bill')
    )
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

使用`in()/idIn()`查询条件
```javascript
//where `oid` =1
sqlRunner.select()
    .where(b.in('oid',[1]))

//where `oid` in (1, 2)
sqlRunner.select()
    .where(b.in('oid',[1,2]))

//idIn()会从传入的行数据里取出(pick)指定字段的值拼接in()查询条件
//idIn()默认取表的主键字段作为`idField`
let users=[{oid:1},{oid:2}];

//where `oid` in (1, 2)
sqlRunner.select()
    .from('t_user','oid')               //指定t_user表的主键为oid
    .where(b.idIn(users))

//where `oid` in (1, 2)
sqlRunner.select()
    .from('t_user')                      //未指定表的主键
    .where(b.idIn(users,'oid'))  //指定'idField'为oid
```

指定子查询条件，使用`in()/exists()`实现`join`查询
```javascript
//select `oid` from `t_user` where `oid` in (select `oid` from `t_user` where `age` < 12)
sqlRunner
    .select('oid')
    .from('t_user','oid')
    .where(b.idIn(
        sqlRunner
            .select('oid')
            .from('t_user')
            .where(b.lt('age',12))
    ))
```

指定分组，排序条件
```javascript
//select `area`, sum(`score`) as `scores` from `t_user`
//group by `area` having `scores` > 100
//order by `scores` desc, `area` asc
sqlRunner
    .select('area')
    .field(b.sum('score').as('scores'))
    .from('t_user')
    .groupBy('area')
    .having(b.gt('scores',100))
    .orderBy(b.desc('scores'),b.asc('area'))
```

使用分页查询，并且返回总记录数
```javascript
//select `oid` from `t_user` limit 10 offset 20
//select count(*) as `total` from `t_user`
//return: {data:Array<T>,total:number}
sqlRunner
    .select('oid')
    .from('t_user')
    .offset(20)
    .limit(10)
    .findWithTotal()
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

## Repository
```javascript

```

## Transaction
```javascript

```

## Dynamic SQL
```javascript

```

## Raw Query
```javascript

```

## Returning Query
```javascript

```

## API
以下仅列出主要API

### 运算符
- `eq()` -`=`
- `neq()` -`!=`
- `lt()` -`<`
- `lte()` -`<=`
- `gt()` -`>`
- `gte()` -`>=`
- `like()` -`like`
- `nlike()` -`not like`
- `in()` -`in`
- `nin()` -`not in`
- `exists()` -`exists`
- `nexists()` -`not exists`
- `isnull()` -`is null`
- `isnotnull()` -`is not null`

### 聚合函数
- `distinct()`
- `count()`
- `avg()`
- `sum()`
- `min()`
- `max()`

### 扩展运算符
- `alwaysTrue()` -添加查询条件`1=1`
- `alwaysFalse()` -`添加查询条件`1!=1
- `idIn()` -类似`in()`，可指定`idField`
- `idNotIn()` -类似`nin()`，可指定`idField`
- `raw()` - 指定raw查询表达式
- `expr()` - 指定复杂条件表达式

### ConnectionManager
- `createDefaultConnection()`
- `createConnections()`
- `getConnection()`
- `existsConnection()`

### Connection
- `close()` -关闭连接池
- `createTx()` -创建事务，需自行提交或回滚事务
- `runInTx()` -在事务里执行查询，传入的事务需要自行提交或回滚

### SqlRunner
- `select()` -获取`SelectSqlRunner`
- `insert()` -获取`InsertSqlRunner`
- `update()` -获取`UpdateSqlRunner`
- `delete()` -获取`DeleteSqlRunner`
- `truncate()` -`truncate table`

### SelectSqlRunner
- `findMany()` -查询多条记录
- `findOne()` -查询1条记录，根据传入的主键值查询
- `findFirst()` -查询前N条记录，默认查询第1条记录
- `findTotal()` -查询满足条件的记录总数
- `findExists()` -查询满足条件的记录是否存在
- `findWithTotal()` -查询多条记录及满足条件的记录总数，用于分页

### UpdateSqlRunner
- `incr()` -字段值自增
- `decr()` -字段值自减
- `replace()` -用另一字段值替换目标字段值
- `save()` -保存记录，即分别执行`insert/update`

### DeleteSqlRunner
- `clear()` -删除所有记录

### Other
- `inTx()` -指定执行SQL时的数据库事务
- `returning()` -指定执行增删改操作后，要返回的受影响的记录(或查询)