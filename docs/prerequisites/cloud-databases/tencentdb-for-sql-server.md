# TencentDB for SQL Server
import Content from '../../reuse-content/_enterprise-and-cloud-features.md';

<Content />

云数据库 SQL Server（TencentDB for SQL Server）具有微软正版授权，具有即开即用、稳定可靠、安全运行、弹性扩缩容等特点，同时也具备高可用架构、数据安全保障和故障秒级恢复功能，让您能专注于应用程序的开发。完成 Agent 部署后，您可以跟随本文教程在 Tapdata 中添加 TencentDB for SQL Server 数据源，后续可将其作为源或目标库来构建数据管道。


## 支持版本

SQL Server 2005、2008、2008 R2、2012、2014、2016、2017

## 添加数据源

1. [登录 Tapdata 平台](../../user-guide/log-in.md)。

2. 在左侧导航栏，单击**连接管理**。

3. 单击页面右侧的**创建**。

4. 在弹出的对话框中，搜索并选择 **TencentDB SQL Server**。

5. 在跳转到的页面，根据下述说明填写 TencentDB SQL Server 的连接信息。

   ![SQL Server 连接示例](../../images/tencent_sqlserver_connection.png)

   * 连接信息设置
      * **连接名称**：填写具有业务意义的独有名称。
      * **连接类型**：支持将 TencentDB SQL Server 作为源或目标库。
      * **数据库地址**：数据库连接地址。
      * **端口**：数据库的服务端口。
      * **数据库名称**：数据库名称，即一个连接对应一个数据库，如有多个数据库则需创建多个数据连接。
      * **账号**：数据库的账号。
      * **密码**：数据库账号对应的密码。
      * **Schema**：Schema 名称。
      * **其他连接串参数**：额外的连接参数，默认为空。
   * 高级设置
      * **时间类型的时区**：默认为数据库所用的时区，您也可以根据业务需求手动指定。
      * **包含表**：默认为**全部**，您也可以选择自定义并填写包含的表，多个表之间用英文逗号（,）分隔。
      * **排除表**：打开该开关后，可以设定要排除的表，多个表之间用英文逗号（,）分隔。
      * **Agent 设置**：默认为**平台自动分配**，您也可以手动指定 Agent。
      * **模型加载频率**：数据源中模型数量大于 1 万时，Tapdata 将按照设置的时间定期刷新模型。

6. 单击**连接测试**，测试通过后单击**保存**。

   :::tip

   如提示连接测试失败，请根据页面提示进行修复。

   :::
