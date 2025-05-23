# TDengine
import Content from '../../reuse-content/_all-features.md';

<Content />

TDengine 是一款开源、高性能、云原生的时序数据库，可适用于物联网、车联网、工业互联网、金融、IT 运维等场景。本文介绍如何在 TapData 上连接 TDengine 数据源，帮助您快速实现数据流转。

## 前提条件

由于TapData 采用 REST 方式连接至 TDengine，在配置连接前，您需要在 TDengine 所属服务器上执行 `sudo systemctl start taosadapter` 命令开启 [taosAdapter](https://docs.taosdata.com/reference/components/taosadapter/) 服务。

:::tip

如希望 TapData 读取 TDengine 的增量数据，您还需要在 Agent 所属服务器上[安装 TDengine 客户端驱动](https://docs.taosdata.com/reference/connector/#%E5%AE%89%E8%A3%85%E5%AE%A2%E6%88%B7%E7%AB%AF%E9%A9%B1%E5%8A%A8)。

:::

## 支持的版本

TDengine 3.x

## 操作步骤

1. [登录 TapData 平台](../../user-guide/log-in.md)。

2. 在左侧导航栏，单击**连接管理**。

3. 单击页面右侧的**创建**。

4. 在弹出的对话框中，搜索并选择 **TDengine**。

5. 在跳转到的页面，根据下述说明填写 TDengine 的连接信息。

   ![连接 TDengine](../../images/connect_tdengine.png)

    * **连接名称**：填写具有业务意义的独有名称。
    * **连接类型**：支持同时作为源或目标。
    * **地址**：填写数据库的连接地址。
    * **端口**：填写 taosAdapter 的服务端口，默认为 6041。
    * **数据库**：数据库名称，一个连接对应一个数据库，如有多个数据库则需创建多个数据连接。
    * **账号**、**密码**：分别填写数据库账号和密码。
    * **连接参数**：额外的连接参数，默认为空。
    * **时区**：默认为数据库所用的时区，您也可以根据业务需求手动指定。
    * **包含表**：默认为**全部**，您也可以选择自定义并填写包含的表，多个表之间用英文逗号（,）分隔。
    * **排除表**：打开该开关后，可以设定要排除的表，多个表之间用英文逗号（,）分隔。
    * **Agent 设置**：默认为**平台自动分配**，您也可以手动指定 Agent。

6. 单击页面下方的**连接测试**，提示通过后单击**保存**。

   :::tip

   如提示连接测试失败，请根据页面提示进行修复。

   :::