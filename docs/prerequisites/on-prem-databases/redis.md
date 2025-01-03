# Redis
import Content from '../../reuse-content/_all-features.md';

<Content />

Redis 是基于内存的 key-value（键值对）数据库，可用于数据缓存、事件发布/订阅、高速队列等场景。TapData 支持将关系型数据库（Oracle、MySQL、MongoDB、PostgreSQL、SQL Server）的数据实时同步至 Redis，帮助您快速完成数据流转。本文介绍如何在 TapData 上连接 Redis 数据源。

## 支持的版本

Redis 2.8 ~ 6.0

## 连接 Redis

1. [登录 TapData 平台](../../user-guide/log-in.md)。

2. 在左侧导航栏，单击**连接管理**。

3. 单击页面右侧的**创建**。

4. 在弹出的对话框中，搜索并选择 **Redis**。

5. 在跳转到的页面，根据下述说明填写 Redis 的连接信息。

   ![连接 Redis](../../images/connect_redis.png)

   * 连接设置
     * **连接名称**：填写具有业务意义的独有名称。
     * **连接类型**：目前仅支持**目标**。
     * **部署模式**：选择**单机部署**或**哨兵部署**，如选择**哨兵部署**，您还需要填写哨兵地址。
     * **数据库地址**：填写数据库的连接地址。
     * **端口**：填写数据库的服务端口。
     * **数据库名称**：填写数据库名称，例如 **0**。
   * 高级设置
   * **Schema 键**：存储为 List 或 Hash 格式，且选择为单键方式时，支持将源表 Schema 写入一个 Hash 键（默认名称为 `-schema-key-`），其值用来存放源表的表名和列名信息。
   * **是否使用密码**：如 Redis 启用了密码验证，您需要打开该开关并填写数据库密码。
   * **Agent 设置**：默认为**平台自动分配**，您也可以手动指定。

6. 单击**连接测试**，测试通过后单击**保存**。

   :::tip

   如提示连接测试失败，请根据页面提示进行修复。

   :::

## 相关文档
[MySQL 实时同步至 Redis](../../case-practices/pipeline-tutorial/mysql-to-redis.md)