# 在 Linux 平台部署

import Content from '../../reuse-content/_enterprise-features.md';

<Content />

本文介绍如何快速在本地的 Linux 平台上部署 TapData 服务。

:::tip

单节点部署可用于功能测试场景，如需用作生产环境，推荐采用[高可用部署](../../administration/production-deploy/install-tapdata-ha.md)。

:::

## 软硬件环境要求

* CPU：8 核
* 内存：16 GB
* 存储空间：100 GB
* 操作系统：CentOS 7 + 、Ubuntu 16.04 +、Red Hat Enterprise Linux（RHEL）7.x/8.x

## 操作步骤



本文以 CentOS 7 为例，演示部署流程。



1. 登录至待部署的设备上，依次执行下述命令完成文件访问数、防火墙等系统参数设置。

   ```bash
   ulimit -n 1024000 
   echo "* soft nofile 1024000" >> /etc/security/limits.conf 
   echo "* hard nofile 1024000" >> /etc/security/limits.conf 
   systemctl disable firewalld.service 
   systemctl stop firewalld.service 
   setenforce 0 
   sed -i "s/enforcing/disabled/g" /etc/selinux/config 
   ```

2. 安装环境依赖。

   1. 执行下述命令安装 Java 1.8 版本。

      ```bash
      yum -y install java-1.8.0-openjdk
      ```

   2. [安装 MongoDB](../../administration/production-deploy/install-replica-mongodb.md)（4.0 及以上版本），该库将作为中间库存储任务等数据。

3. 下载 TapData 安装包（可[联系我们](mailto:team@tapdata.io)获取），将其上传至待部署的设备中。

4. 在待部署的设备上，执行下述格式的命令，解压安装包并进入解压后的路径。

   ```bash
   tar -zxvf 安装包名&&cd tapdata
   ```

   例如：`tar -zxvf tapdata-release-v2.14.tar.gz&&cd tapdata `

5. 准备 License 文件。

   1. 执行下述命令获取申请所需的 SID 信息。

      ```bash
      java -cp components/tm.jar -Dloader.main=com.tapdata.tm.license.util.SidGenerator org.springframework.boot.loader.PropertiesLauncher
      ```

   2. 将打印出的 SID 信息提供给 TapData 支持团队，完成 License 申请流程。

   3. 将申请到的 License 文件上传至解压后的目录（**tapdata**）中。

6. 执行 `./tapdata start`，跟随命令行提示，依次设置 TapData 的登录地址、API 服务端口、MongoDB 连接信息等，示例及说明如下：

   :::tip

   如采用非 root 用户部署，应避免使用 `sudo` 提权操作以避免安装失败。在执行命令前，请使用 `sudo chown -R <your-username>:<your-group> <installation-dir>` 或 `sudo chmod -R 777 <installation-dir>` 为当前用户赋予安装目录的完全权限。

   :::

   ```bash
    ./tapdata start
    _______       _____  _____       _______
   |__   __|/\   |  __ \|  __ \   /\|__   __|/\    
      | |  /  \  | |__) | |  | | /  \  | |  /  \   
      | | / /\ \ |  ___/| |  | |/ /\ \ | | / /\ \  
      | |/ ____ \| |    | |__| / ____ \| |/ ____ \ 
      |_/_/    \_\_|    |_____/_/    \_\_/_/    \_\ 
   
   WORK DIR:/root/tapdata
   Init tapdata...
   ✔ Please enter backend url, comma separated list. e.g.:http://127.0.0.1:3030/ (Default: http://127.0.0.1:3030/):  …
   ✔ Please enter tapdata port. (Default: 3030):  …
   ✔ Please enter api server port. (Default: 3080):  …
   ✔ Does MongoDB require username/password?(y/n):  … no
   ✔ Does MongoDB require TLS/SSL?(y/n):  … no
   ✔ Please enter MongoDB host, port, database name(Default: 127.0.0.1:27017/tapdata):  …
   ✔ Does API Server response error code?(y/n):  … yes
   MongoDB uri:  mongodb://127.0.0.1:27017/tapdata
   MongoDB connection command: mongo  mongodb://127.0.0.1:27017/tapdata
   System initialized. To start Tapdata, run: tapdata start
   WORK DIR:/root/tapdata
   Testing JDK...
   java version:1.8
   Java environment OK.
   Unpack the files...
   Restart TapdataAgent ...:
   TapdataAgent starting ...:
   ```

   * **Please enter backend url**：设置 TapData 平台的登录地址，默认为 `http://127.0.0.1:3030/`
   * **Please enter tapdata port**：设置 TapData 平台的登录端口，默认为 `3030`。
   * **Please enter api server port**：设置 API Server 的服务端口，默认为 `3080`。
   * **Does MongoDB require username/password?**：MongoDB 数据库是否启用了安全认证，未启用则输入 **n**，如果启用则输入 **y**，然后根据提示分别输入用户名、密码和鉴权数据库（默认为 `admin`）。
   * **Does MongoDB require TLS/SSL?(y/n)**：MongoDB 数据库是否启用 TSL/SSL 加密，未启用则输入 **n**，如果启用则输入 **y**，然后根据提示分别输入 CA 证书和 Certificate Key 文件的绝对地址路径，以及 Certificate Key 的文件密码。
   * **Please enter MongoDB host, port, database name**：设置 MongoDB 数据库的 URI 连接信息，默认为 `127.0.0.1:27017/tapdata`。
   * **Does API Server response error code?**：是否启用 API Server 响应错误码功能。

   部署成功后，命令行返回示例如下：

   ```bash
   deployed connector.
   Waiting for the flow engine to start \
   FlowEngine is startup at : 2023-04-01 23:00
   API service started
   ```

7. 通过浏览器登录 TapData 平台，本机的登录地址为  [http://127.0.0.1:3030](http://127.0.0.1:3030)，首次登录请及时修改密码以保障安全性。

   :::tip

   如需在同一内网的其他设备上访问 TapData 服务，请确保网络可互通。

   :::



## 部署命令执行示例

import AsciinemaPlayer from '@site/src/components/AsciinemaPlayer/AsciinemaPlayer.tsx';

<AsciinemaWidget src="https://docs.tapdata.io/asciinema_playbook/install_tapdata.cast" rows={20} idleTimeLimit={3} preload={true} />


<AsciinemaPlayer
    src="/asciinema_playbook/install_tapdata.cast"
    poster="npt:0:20"
    rows={25}
    speed={1.8}
    preload={true}
    terminalFontSize="15px"
    fit={false}
/>



## 下一步

[连接数据库](../../quick-start/connect-database.md)