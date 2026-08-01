---
slug: /administration/monitor-with-prometheus
---

# 使用 Prometheus 监控 TapData

import Content from '../../reuse-content/\_enterprise-features.md';

<Content />

本文介绍如何使用 Prometheus 采集 TapData 监控指标，并通过 Grafana 查看运行趋势、通过 Alertmanager 发送异常通知。您还可以根据需要监控 TapData 使用的 MongoDB 系统库。

## 从哪里开始

| 当前目标                                        | 建议阅读                                           |
| ------------------------------------------- | ---------------------------------------------- |
| 首次接入，尚未安装 Prometheus、Grafana 或 Alertmanager | [部署 Prometheus 监控](deployment.md)              |
| 已有 Prometheus、Grafana 或 Alertmanager，只需接入 TapData | [将 TapData 接入现有监控平台](deployment.md#已有监控平台时如何接入) |
| 已经能采集指标，但不清楚曲线含义和正常范围                       | [指标说明与健康判定](metrics.md)                        |
| 需要导入 TapData、API Server 或 MongoDB 看板        | [Grafana 看板使用指南](grafana.md)                   |
| 需要监控 TapData 使用的 MongoDB 系统库                | [配置 MongoDB 监控](deployment.md#可选配置-mongodb-监控) |
| 需要配置分级告警、通知、巡检和故障处理流程                       | [告警配置与监控巡检](alerting.md)                       |

如果已经完成部署但看板显示 **No data**，请直接阅读[无数据排查](grafana.md#无数据排查)。

## 推荐操作流程

首次接入时，建议按照以下顺序完成配置和验收：

1. [启用并确认指标端点](deployment.md#步骤一启用并确认指标端点)，只将实际返回 Prometheus 指标的端点加入采集配置。
2. 部署本文示例中的监控服务，或[将 TapData 接入现有监控平台](deployment.md#已有监控平台时如何接入)。
3. [确认当前环境实际提供的指标](metrics.md#查看当前环境实际提供的指标)，再决定启用哪些任务、API Server 或 MongoDB 看板和告警。
4. [下载并导入 Grafana 模板](grafana.md#下载模板)，先选择单个实例与实际页面核对数据。
5. [安装告警规则](alerting.md#安装和校验规则)、按业务 SLA 调整阈值，并[测试通知链路](alerting.md#测试通知链路)。
6. 按照[巡检 SOP](alerting.md#巡检-sop)执行日常检查和故障升级。

## 常用术语

| 术语 | 本文中的含义 |
| --- | --- |
| Target（采集目标） | Prometheus 定时访问的一个指标地址。 |
| 指标地址（端点） | 通过 HTTP 返回监控数据的 URL，例如 Flow Engine 的 `/actuator/prometheus`。 |
| 抓取（scrape） | Prometheus 定时访问指标地址并保存数据的过程。 |
| 指标 | 可查询的运行数据，例如服务状态、CPU 使用率和任务延迟。 |
| 标签 | 用于筛选指标的附加信息，例如 `project`、`instance` 和 `task_name`。 |
| PromQL | Prometheus 的查询语言。本文标记为 `promql` 的查询可在 Prometheus 查询页执行。 |
| Exporter（采集器） | 将 MongoDB 等系统的状态转换为 Prometheus 指标的程序。 |
| **No data** | 当前查询没有找到匹配的数据，不等于指标值为 `0`。 |
| SLA | 业务约定的服务目标，例如任务允许的最大同步延迟。 |

## 能够监控什么

| 对象          | 主要信号                              |
| ----------- | --------------------------------- |
| Management  | 服务存活、HTTP 请求、JVM、进程和主机资源          |
| Flow Engine | 服务存活、JVM、进程和主机资源                  |
| TapData 任务  | 任务状态、数据源连接、CDC 延迟、节点处理耗时和启动里程碑    |
| Agent       | Agent 存活、进程和主机资源                  |
| API Server  | HTTP 请求、Node.js、进程和日志指标           |
| MongoDB     | 数据库连接、复制集、连接数、操作速率和 WiredTiger 缓存 |

## 检查监控是否可用

完成部署后，建议按照以下标准进行检查：

1. Prometheus 的 **Status** > **Target health** 中，所有需要监控的目标均为 **UP**；没有部署的组件不应保留在[采集配置](deployment.md#检查抓取目标)中。
2. Grafana 数据源测试成功，[模板变量](grafana.md#确认看板数据)能够列出当前环境和实例。
3. 看板中的数值、单位、状态映射和任务数量已经与实际情况完成[对比确认](grafana.md#确认看板数据)。
4. 只有已确认存在的指标才配置告警；任务延迟阈值已经按照[业务 SLA](metrics.md#起始健康阈值)调整。
5. [通知测试](alerting.md#测试通知链路)中，告警能够从 Pending（等待持续时间）进入 Firing（已触发），预期接收器收到通知，恢复后还能收到 resolved（已恢复）通知。
6. 值班人员已经了解[告警后的处理顺序](alerting.md#告警后的处理顺序)、故障分级和升级条件。
