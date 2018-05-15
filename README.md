[b-sql-runner](https://github.com/bingooh/b-sql-runner)是一款简单的`sql query builder`，致力于以最接近写SQL的方式来完成对数据的操作

b-sql-runner底层使用[knex](https://github.com/tgriesser/knex)执行SQL，后期可能使用其他库实现。**目前没有单元测试，请谨慎考虑在生产环境里使用**，欢迎PR单元测试

b-sql-runner参考了以下框架，在次致谢
- [knex](https://github.com/tgriesser/knex)
- [typeorm](https://github.com/typeorm/typeorm)
- [squel](https://github.com/hiddentao/squel)

## Feature
- **仅支持单表的增删改查**
- 动态SQL
- 事务

## INSTALL
```
npm install b-sql-runner
```

