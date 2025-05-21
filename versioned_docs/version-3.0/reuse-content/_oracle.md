### 前提条件（作为源）

#### 开启 LogMiner

- 以具有 DBA 权限的用户身份登录数据库
- 查看数据库的 logging mode :select log_mode from v$database;
- 如果返回的结果是 ARCHIVELOG , 您可以直接跳到 开启 Supplemental Logging
- 如果返回的结果是 NOARCHIVELOG , 继续按照以下步骤操作:
- 关闭数据库: shutdown immediate;
- 启动并挂载数据库:startup mount;
- 开启存档并打开数据库:

```bash
alter database archivelog;
alter database open;
```



#### 开启 Supplemental Logging

**Oracle 9i**

```bash
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
```

**Oracle 10g、11g**

```bash
alter database add supplemental log data;
alter system switch logfile;
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
```

**Oracle 12C 的特殊配置方法**

使用以下命令，确认 supplemental logging 是否开启

```bash
SELECT supplemental_log_data_min, supplemental_log_data_pk, supplemental_log_data_all FROM v$database;
```

如果返回的三列都是 Yes 或者 Implicit ，则表示 identification key logging(标识键日志)和 full supplemental logging（全补充日志）已同时开启，您可以跳到 创建用户账号

如果返回的前两列是 Yes 或者 Implicit ，则表示只开启了 identification key logging(标识键日志)。如果这个能满足您的需求，则可以跳到创建用户账号



#### 开启 identification key(标识键日志)

当使用 12c 的 PDB 时，最佳做法是为容器的表开启日志，而不是对整个数据库开启日志。您可以先使用以下命令将更改应用于容器：

```bash
ALTER SESSION SET CONTAINER=<pdb>;
```

为单个表开启identification key(标识键日志)：

```bash
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;
ALTER TABLE <schema name>.<table name> ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
```

对所有表开启identification key(标识键日志)：

```bash
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (PRIMARY KEY) COLUMNS;
```



#### 开启 full supplemental logging（全补充日志）

单表开启full supplemental logging（全补充日志）：

```bash
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA;
ALTER TABLE <schema name>.<table name> ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
```

所有表开启full supplemental logging（全补充日志）：

```bash
ALTER DATABASE ADD SUPPLEMENTAL LOG DATA (ALL) COLUMNS;
```

提交更改的配置：

```plsql
ALTER SYSTEM SWITCH LOGFILE;
```

#### 创建用户账号

**Oracle 10g、11g**

创建用户帐户并分配权限

```sql
CREATE USER <user name> IDENTIFIED BY <password>;
GRANT create session, alter session, execute_catalog_role, select any dictionary, select any transaction, select any table, create any table, create any index, unlimited tablespace to <user name>;
```

**Oracle 12c multitenant databases**

在 Oracle 12c 的多租户环境下创建用户，必须在 cdb 中创建，并且命名格式约定为：`c##<name>`

以具有 DBA 权限的用户身份登录数据库

创建普通用户:

```sql
ALTER SESSION SET CONTAINER=cdb$root;
CREATE USER <user name> IDENTIFIED BY <password> CONTAINER=all;
GRANT create session, alter session, set container, select any dictionary, select any transaction, logmining, execute_catalog_role, create any table, create any index, unlimited tablespace TO <username> CONTAINER=all;
ALTER SESSION SET CONTAINER=<pdb>;
```

根据您对表的权限需求，重复执行最后一个命令来赋予 select 权限。

当您配置的是源库连接时，请使用此用户来通过 JDBC 的身份验证。 注意必须使用整个用户名（包括“c ##”）作为JDBC连接的用户名。

**Oracle 12c standard databases**

在 Oracle 12c 标准模式下，创建一个用户所必须的权限：

以具有DBA权限的用户身份登录数据库

创建普通用户:

```sql
CREATE USER <user name> IDENTIFIED BY <password>;
GRANT create session, alter session, select any dictionary, select any transaction, logmining, execute_catalog_role, create any table, create any index, unlimited tablespace TO <username>;
```



根据您对表的权限需求，重复执行最后一个命令来赋予 select 权限。



### 已知问题

Oracle 的 connection_time

connect_time 参数将自动断开超时的会话。 默认情况下，它是无限的。 设置此设置后，TapData 的实时同步可能无法正常工作。 要检查设置的值，可以使用以下命令：

```sql
select resource_name, limit from dba_profiles where profile=( select profile from dba_users where username = '<username>');
```