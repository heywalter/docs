# GBase 8a
import Content from '../../reuse-content/_enterprise-and-cloud-features.md';

<Content />

GBase 8a 数据库是一款基于 MySQL 数据库研发的分析型数据库，对 MySQL 的语法、特性、字段类型基本兼容。

## 支持版本

目前 GBase 8a 向外开放的所有版本

## 数据库特殊性提示（作为目标）

- GBase 8a产品主要用于数据分析使用，可以设置主键，但约束不生效，另外索引也不允许创建。接入TapData后只能依赖于逻辑主键，且数据幂等性不可靠。
- GBase 8a对事务的支持度相对较低，同一事务内除了多条插入以外，均不支持。