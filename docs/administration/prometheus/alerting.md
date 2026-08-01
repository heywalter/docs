# Prometheus 告警配置与监控巡检

本文介绍如何加载 Prometheus 告警规则、配置 Alertmanager 通知，并提供日常巡检清单和故障分级处理流程。开始前，请先完成[Prometheus 采集检查](deployment.md#步骤三检查监控链路)，并根据[指标说明与健康判定](metrics.md)确定任务 SLA。

## 告警设计原则

- 优先告警业务可感知的问题：组件不可采集、任务失败、持续重试、连接失败、同步延迟和 API 5xx。
- CPU、内存、GC 等资源信号主要用于预警和诊断；没有业务影响时不要直接升级为最高级事件。
- 使用 `for` 排除短暂波动，使用 Alertmanager 分组和抑制避免同一故障重复通知。
- 告警通知应包含环境、组件、实例、任务、当前值、持续时间和处置链接。
- Prometheus 的 `warning/critical` 表示技术信号强度，最终故障等级还要结合业务影响范围判断。

## 安装和校验规则

<a href="/resources/TapData_Prometheus_Alert_Rules.yaml">下载 TapData Prometheus 告警规则</a>，保存为 `tapdata-alert-rules.yml`。

下载文件包含组件可用性、资源、HTTP、MongoDB 和任务五个规则组。规则文件可以整体加载，但只有当前环境实际存在的指标才能提供告警保护。

加载任务规则前，应在至少一个任务运行时执行以下查询：

```promql
count(task_status{job="tapdata-flow-engine"})
count(task_active_db{job="tapdata-flow-engine"})
count(task_cdc_delay_ms{job="tapdata-flow-engine"})
```

若这些查询均无数据，`tapdata-tasks` 规则组无法发现任务异常，即使规则能够通过语法检查并显示 **Inactive**，也不能证明任务健康。

此时请在规则文件中暂时删除或注释 `name: tapdata-tasks` 对应的整个规则组，只保留已经确认有数据的组件、资源、HTTP 和 MongoDB 规则，并在 TapData 任务监控页面查看任务状态。指标地址开始返回任务指标后，再恢复任务规则并完成一次故障演练。

如果启用了 MongoDB 规则，还应确认：

```promql
mongodb_up{job="mongodb"}
mongodb_rs_myState{job="mongodb"}
```

`mongodb_up` 应为 `1`。只有当前部署形态和启用的采集项（collector）提供复制集状态指标时，才启用对应规则。非复制集部署没有该指标时，应删除 `MongoDBReplicaSetStateUnhealthy`，不要把没有数据当作复制集健康。

使用 Prometheus 容器中的 `promtool` 进行静态检查：

```bash
docker run --rm \
  --entrypoint /bin/promtool \
  -v "$PWD:/work:ro" \
  prom/prometheus:v3.13.1 \
  check rules /work/tapdata-alert-rules.yml
```

确认 `prometheus.yml` 包含规则文件和 Alertmanager：

```yaml
rule_files:
  - /etc/prometheus/tapdata-alert-rules.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']
```

Docker Compose 还必须挂载规则文件：

```yaml
volumes:
  - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
  - ./tapdata-alert-rules.yml:/etc/prometheus/tapdata-alert-rules.yml:ro
```

重新创建 Prometheus 容器以应用新增的文件挂载，然后检查规则：

```bash
docker compose up -d prometheus
docker compose logs --tail=100 prometheus
curl -fsS http://<monitor-host-private-ip>:9090/api/v1/rules
```

Prometheus 的 **Status** > **Rule health**（部分版本显示为 **Rules**）中不应出现加载错误。规则列表中的常见状态如下：

| 状态 | 含义 |
| --- | --- |
| **Inactive** | 当前没有满足告警条件。若对应指标不存在，也可能一直显示该状态。 |
| **Pending** | 已满足告警条件，但尚未达到规则中 `for` 设置的持续时间。 |
| **Firing** | 已达到持续时间，告警正在触发。 |

## 规则覆盖范围

| 规则类别 | 组件 | Warning | Critical |
| --- | --- | --- | --- |
| 指标目标不可抓取 | Management、Flow Engine、Agent、API Server、MongoDB exporter | — | 持续 2 分钟 |
| 磁盘空间 | Management、Flow Engine、Agent | 可用空间低于 20% | 可用空间低于 10% |
| CPU | Management、Flow Engine、Agent | 5 分钟均值高于 85% | 5 分钟均值高于 95% |
| Management 5xx | Management | 比例高于 5% | 比例高于 20% |
| API 5xx | API Server | 比例高于 5% | 比例高于 20% |
| MongoDB 数据库连接 | MongoDB exporter | — | `mongodb_up=0` 持续 2 分钟 |
| MongoDB 复制集状态 | MongoDB | 非 PRIMARY、SECONDARY、ARBITER 持续 5 分钟 | — |
| 任务状态 | Flow Engine | 重试持续 10 分钟 | 失败持续 1 分钟 |
| 数据源连接 | Flow Engine | — | 网络/服务端或认证错误持续 1 分钟 |
| CDC 延迟 | Flow Engine | 高于 30 秒持续 5 分钟 | 高于 5 分钟持续 5 分钟 |

任务规则仅在 Flow Engine 实际提供对应 `task_*` 指标时有效。API 和 Management 5xx 规则仅在存在实际请求流量时评估。MongoDB 连接和复制集规则仅在 exporter 提供对应指标时有效；缓存、连接数和操作速率应先建立环境基线，不使用统一紧急阈值。

## 配置告警通知

下面以通用 Webhook 为例。将 URL 替换为企业微信、飞书、PagerDuty、中间通知网关或工单平台提供的实际地址，并限制 `alertmanager.yml` 文件权限。

```yaml title="alertmanager.yml"
route:
  receiver: ops-webhook
  group_by: [alert_family, project, instance, task_name]
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  routes:
    - receiver: oncall-webhook
      matchers:
        - severity="critical"
      repeat_interval: 30m

receivers:
  - name: ops-webhook
    webhook_configs:
      - url: 'https://<notification-gateway>/alerts/warning'
        send_resolved: true

  - name: oncall-webhook
    webhook_configs:
      - url: 'https://<notification-gateway>/alerts/critical'
        send_resolved: true

inhibit_rules:
  - source_matchers:
      - severity="critical"
    target_matchers:
      - severity="warning"
    equal: [alert_family, project, instance, task_name]
```

该配置实现：warning 进入普通运维通道，critical 进入值班通道；同一对象的 critical 告警触发时抑制 warning；恢复后发送 resolved（告警恢复）通知。不同告警系统的鉴权和消息格式不同，接入时应由通知网关保存密钥，避免把 Token 放进公开仓库。

修改后执行：

```bash
docker compose restart alertmanager
docker compose logs --tail=100 alertmanager
curl -fsS http://<monitor-host-private-ip>:9093/-/ready
```

更多路由、分组和抑制配置参见 [Alertmanager configuration](https://prometheus.io/docs/alerting/latest/configuration/)。

## 测试通知链路

在测试环境或维护窗口向 Alertmanager 发送一条模拟告警：

```bash
starts_at=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
ends_at=$(date -u -d '+5 minutes' +"%Y-%m-%dT%H:%M:%SZ")
curl -fsS -X POST http://<monitor-host-private-ip>:9093/api/v2/alerts \
  -H 'Content-Type: application/json' \
  -d "[{
    \"labels\": {
      \"alertname\": \"TapDataNotificationTest\",
      \"alert_family\": \"notification_test\",
      \"severity\": \"warning\",
      \"project\": \"tapdata-test\",
      \"instance\": \"manual\"
    },
    \"annotations\": {
      \"summary\": \"TapData monitoring notification test\"
    },
    \"startsAt\": \"${starts_at}\",
    \"endsAt\": \"${ends_at}\"
  }]"
```

检查标准：Alertmanager 页面出现该告警、预期接收器收到 firing（告警触发）通知、通知包含关键标签；约 5 分钟后还应收到 resolved（告警恢复）通知。上述 `date -d` 语法适用于常见 Linux 发行版。不要为测试长期保留一个恒为真的 Prometheus 规则。

页面中的告警名称、`project`、`instance` 和 `severity` 应与请求中的标签一致。页面出现告警只表示 Alertmanager 已接收，还需要检查实际接收器先收到告警触发通知、再收到告警恢复通知，确认通知链路完整。

生产上线前还应演练两类真实链路：临时阻断测试目标以验证 `TargetDown`；若已确认任务指标存在，再让专用测试任务进入失败状态以验证任务规则。演练不得影响生产任务。

## 告警后的处理顺序

1. **确认采集可信**：检查 `up`、**Status** > **Target health** 和指标地址。如果采集失败，不根据停止更新的业务曲线判断任务状态。
2. **确认影响范围**：使用 `project`、`job`、`instance`、`task_name` 判断单任务、单节点还是全局异常。
3. **确认业务影响**：检查关键任务状态、延迟、API 5xx 和用户反馈。
4. **定位根因**：关联任务日志、连接测试、源/目标数据库状态、组件资源和最近变更。
5. **处理并验证恢复**：目标恢复 UP、任务状态和连接状态恢复为 0、延迟持续下降并回到 SLA 内、错误率回落后再关闭事件。
6. **记录和复盘**：记录时间线、影响范围、根因、处置、恢复证据，以及需要调整的规则或文档。

任务问题可参考[任务故障排查](../troubleshooting/task-troubleshooting.md)，系统和依赖问题可参考[系统维护与应急处理策略](../emergency-plan.md)。

## 故障分级与升级

告警等级不能直接等同于故障等级。例如，测试环境出现 critical 告警不一定是 P1，而关键业务任务持续延迟即使最初是 warning，也可能需要升级。

| 故障等级 | 典型场景 | 建议响应 | 升级条件 |
| --- | --- | --- | --- |
| P1 | 多节点或大面积任务中断；核心链路不可用且无绕行方案 | 立即通知值班负责人和业务负责人，建立事件群并持续处置 | 已产生重大业务影响、数据连续性风险或影响仍在扩大 |
| P2 | 单个关键任务失败；关键任务持续超出 SLA；API 大量 5xx | 15 分钟内确认并开始处置 | 超过约定时间未恢复、影响扩大或出现数据风险 |
| P3 | 非关键任务短暂重试；资源趋势预警；没有业务影响的单实例异常 | 工作时间内处理并持续观察 | 重复发生、趋势恶化或开始影响 SLA |

具体响应时间应以您的业务 SLA 为准。值班人员无法在一个响应周期内确认根因时，应先升级协同，不必等待完成根因定位后再通知。

## 巡检 SOP

| 频次 | 检查项 | 合格标准 | 产出 |
| --- | --- | --- | --- |
| 每日 | Prometheus 采集目标、当前 critical、任务失败/重试、关键任务延迟、API 5xx | 必需目标为 UP；所有业务异常已有负责人或工单 | 当日异常和未关闭事项 |
| 每周 | 延迟和节点耗时趋势、CPU/内存/磁盘、MongoDB 副本集和 Oplog、噪声告警 | 无持续恶化趋势；阈值和通知无明显噪声 | 容量与规则调整清单 |
| 每月及重大变更后 | TargetDown、任务失败和通知恢复演练；联系人、路由、处置文档 | 正确人员收到告警并能够独立完成定位和恢复验证 | 演练记录和改进项 |

建议工单至少记录：告警开始和恢复时间、环境、实例、任务、影响、相关日志时间范围、最近变更、处置动作、恢复查询结果和后续改进。

## 阈值维护

- 首次上线先使用示例阈值，但 CDC 延迟必须按任务 SLA 调整。
- 运行一周后根据平峰、高峰和历史分位数校准资源规则。
- 同一告警同时触发 warning 和 critical 时，通过 `alert_family` 和抑制规则只发送最高等级。
- 每次事件复盘都检查漏报、误报、通知缺失和恢复条件。
- 规则修改应经过 `promtool` 检查、测试环境验证、评审和变更记录。

Prometheus 官方也建议使用 `for` 控制告警触发前的持续时间，并使用 `promtool check rules` 及规则单元测试验证配置，参见 [Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)。
