# Prometheus 指标说明与健康判定

本文帮助运维人员回答三个问题：指标代表什么、曲线变化是否异常、达到什么条件需要介入。部署和采集步骤参见[部署 Prometheus 监控](deployment.md)。

## 判读原则

建议按照以下顺序判断，而不是先从 CPU、内存等资源曲线开始：

1. **采集是否可信**：检查 `up` 和 Prometheus 的 **Status** > **Target health**。采集失败时，其他曲线可能只是停止更新。
2. **业务是否受影响**：检查任务失败、持续重试、数据源连接异常、同步延迟和 API 5xx。
3. **资源是否成为瓶颈**：结合 CPU、负载、磁盘、JVM/Node.js 内存、GC 和文件句柄定位原因。

阈值分为两类：状态类指标可以直接根据明确的状态值告警；性能和容量类指标应以业务 SLA、机器规格和历史基线为准。本文给出的百分比和时长是首次上线的起始建议，不是所有环境的固定正常值。

## 第一次查看时先看什么

| 查看顺序 | 正常表现 | 异常时先做什么 |
| --- | --- | --- |
| 采集状态 `up` | 需要监控的目标为 `1` | 检查目标地址、端口、网络和指标路径。采集恢复前，不要用停止更新的曲线判断业务状态。 |
| 任务状态 `task_status` | 运行中任务为 `0` | `1` 表示失败，`2` 表示重试；检查任务日志、关联连接和 Flow Engine。查询无数据时，先确认当前环境是否提供任务指标。 |
| 数据源连接 `task_active_db` | 为 `0` | 测试连接，并检查数据库服务、网络、凭据和证书。 |
| 同步延迟 `task_cdc_delay_ms` | 在任务 SLA 内，短时升高后能够回落 | 持续升高时检查源端写入、节点处理耗时、目标端写入和网络。 |
| 磁盘和 CPU | 磁盘可用比例高于 20%，CPU 没有持续高位 | 结合任务延迟和错误判断是否已影响业务，再检查数据增长、日志、GC 和其他进程。 |

确认核心信号后，再根据异常现象查看 JVM、GC、线程池和文件句柄等诊断指标。

## 查看当前环境实际提供的指标

不同环境提供的指标可能不同，因此不需要先记住完整指标列表。先查看当前指标地址实际返回的数据，再决定启用哪些看板和告警。可使用以下命令查看指标名称、帮助信息和类型：

```bash
curl -fsS http://<host>:3035/actuator/prometheus \
  | grep -E '^# (HELP|TYPE) '
```

也可以通过 Prometheus API 查看已经采集到的元数据：

```bash
curl -fsS 'http://<monitor-host-private-ip>:9090/api/v1/metadata?limit=10000'
```

遇到文档未列出的指标时，先确认以下信息再配置告警：

- 指标类型是 Counter、Gauge 还是 Histogram。
- 单位是秒、毫秒、字节、比例还是累计次数。
- 标签及其可能值，尤其是任务、节点、状态和接口标签。
- 指标在任务停止、组件重启或功能未启用时是归零还是消失。

日常巡检不需要逐项解读所有指标。优先确认 `up`、任务状态、连接状态、同步延迟和磁盘等核心信号；出现异常后，再查看 JVM、GC、线程池等诊断指标。

## 核心任务指标

任务查询和规则应包含 `job="tapdata-flow-engine"`，防止与其他组件的同名指标混合。

:::caution 上线前先确认任务指标可用

以下表格说明指标出现时的含义。使用任务看板或告警前，请在至少一个任务运行期间执行：

```bash
curl -fsS http://<host>:3035/actuator/prometheus \
  | grep -E '^# (HELP|TYPE) task_(status|active_db|cdc_delay_ms|node_process_data_ms|milestone_status|milestone_time)'
```

如果没有任何输出，说明当前端点没有提供任务级指标。此时任务规则会一直处于 Inactive，任务看板会显示 **No data**；两者都不能证明任务健康。请仅启用当前环境已经确认存在的组件、资源、HTTP 或 MongoDB 监控，并在 TapData 任务监控页面查看任务状态、同步进度和数据校验。

:::



下表的状态值只适用于 Flow Engine 的任务指标。复制本页的查询、看板或告警规则时，请保留 `job="tapdata-flow-engine"`。其他组件可能提供同名指标；删除过滤条件会混合不同含义的数据，导致任务状态和数量统计错误。



| 指标 | 含义和取值 | 健康判定 | 建议告警与排查 |
| --- | --- | --- | --- |
| `task_status` | `0` 运行中，`1` 失败，`2` 重试。 | `0` 正常；`1` 已失败；`2` 表示正在恢复，持续存在说明恢复未完成。 | `1` 持续 1 分钟为严重；`2` 持续 10 分钟为警告。检查任务日志、关联连接和 Flow Engine。 |
| `task_active_db` | `0` 正常，`1` 服务端终止或网络异常，`2` 用户名或密码无效。 | 非 0 时，对应节点通常无法继续读写。 | 非 0 持续 1 分钟为严重。测试连接并检查网络、数据库状态、凭据、证书。 |
| `task_cdc_delay_ms` | 增量同步延迟，单位为毫秒。只对持续增量任务有意义。 | 短时尖峰后下降通常是临时抖动；持续上升说明输入速率高于处理能力。 | 初始可使用 30 秒警告、5 分钟严重，必须按任务 SLA 调整。检查源端写入、节点耗时、目标端写入和网络。 |
| `task_node_process_data_ms` | 单个任务节点处理数据的平均耗时，单位为毫秒。 | 与同一节点的历史基线比较；不宜跨数据库和任务直接比较。 | 不建议单独触发紧急告警。与延迟同步升高时，检查相应源端或目标端。 |
| `task_milestone_status` | 启动里程碑状态，相关标签包括 `milestone_status`、`milestone` 和 `order`。 | 启动阶段应逐步完成；长期等待、运行或出现错误需要排查。 | 用于启动失败的辅助诊断，不建议为每个里程碑单独通知。 |
| `task_milestone_time` | 已完成或出错里程碑的耗时，单位为毫秒。 | 与同类任务及同一任务的历史启动耗时比较。 | 用于启动变慢和容量规划，不设置统一阈值。 |

以下标签主要用于按任务或节点筛选数据。初次使用时，可先关注 `task_name` 和 `node_name`。Prometheus 采集时还会添加 `job`、`instance` 和本文配置的 `project` 标签。

| 指标 | 常用标签 | 使用说明 |
| --- | --- | --- |
| `task_status` | `task_id`、`task_name`、`task_type` | 按任务定位运行、失败或重试状态。 |
| `task_active_db` | `task_id`、`task_name`、`task_type`、`node_id`、`node_name` | 按任务节点定位连接异常。 |
| `task_cdc_delay_ms` | `task_id`、`task_name`、`task_type` | 只在对应任务产生增量延迟样本时出现。 |
| `task_node_process_data_ms` | `node_id`、`node_name`、`node_type`、`task_id`、`task_name`、`task_type` | 适合按节点与同一任务的历史基线比较。 |
| `task_milestone_status`、`task_milestone_time` | `task_id`、`task_name`、`task_type`、`milestone_status`、`milestone`、`order` | `milestone_status` 的常见值包括 `waiting`、`running`、`error`、`finish`；状态指标通常以样本值 `1` 表示当前标签组合。 |

某些任务指标只在对应阶段产生。例如，任务未进入增量阶段时可能没有延迟指标，里程碑未执行时可能没有里程碑指标。此时 **No data** 表示没有匹配的数据，不等于指标值为 `0`。

如果任务正在运行，但上述任务指标全部不存在，请按“当前环境未提供任务指标”处理，并回到 TapData 任务监控页面查看任务状态。

常用查询：

```promql
# 失败或重试中的任务
task_status{job="tapdata-flow-engine"} != 0

# 延迟最高的 10 个任务
topk(10, task_cdc_delay_ms{job="tapdata-flow-engine"})

# 最近 10 分钟各节点平均处理耗时
avg_over_time(task_node_process_data_ms{job="tapdata-flow-engine"}[10m])
```

:::note 数据校验不在本文告警范围内

请继续在 TapData 任务监控页面查看数据校验结果。本文列出的任务指标不包含数据校验结果、差异条数或校验状态；任务保持运行、延迟较低，也不能证明源表和目标表的数据完全一致。

:::

## 组件与运行时指标

### Management 和 Flow Engine

| 指标 | 类型或单位 | 运维用途 |
| --- | --- | --- |
| `up` | Gauge，0/1 | 判断 Prometheus 是否能抓取目标。它不等于任务是否健康。 |
| `disk_free_bytes`、`disk_total_bytes` | Gauge，字节 | 计算磁盘可用比例和消耗趋势。 |
| `system_cpu_usage`、`process_cpu_usage` | Gauge，0～1 | 分别查看主机和进程 CPU。持续高位并伴随业务症状时才升级处理。 |
| `system_cpu_count` | Gauge，核数 | 用于解释系统负载和容量。 |
| `system_load_average_1m` | Gauge | 与 CPU 核数结合判断 CPU、I/O 或阻塞压力。 |
| `process_files_open_files`、`process_files_max_files` | Gauge | 计算文件描述符使用比例，观察是否持续增长并逼近进程上限。 |
| `jvm_memory_used_bytes`、`jvm_memory_committed_bytes`、`jvm_memory_max_bytes` | Gauge，字节 | 按 `area`、`id` 等标签查看 Heap、Metaspace 等内存区域；只有 `max` 大于 0 时才计算使用比例。 |
| `jvm_buffer_memory_used_bytes` | Gauge，字节 | 查看 Direct Buffer 等堆外缓冲区。 |
| `jvm_gc_pause_seconds_count`、`jvm_gc_pause_seconds_sum`、`jvm_gc_pause_seconds_max` | Counter/Gauge，秒 | 使用 `rate(sum)/rate(count)` 查看窗口内平均 GC 暂停，并结合最大暂停和业务延迟判断影响。 |
| `jvm_threads_live_threads`、`jvm_threads_peak_threads`、`jvm_threads_states_threads` | Gauge，线程数 | 观察线程总量及各状态变化；持续增长或阻塞线程增加时结合线程栈排查。 |
| `http_server_requests_seconds_count` | Counter，请求数 | 使用 `rate()` 计算 Management 请求速率和错误比例。 |
| `http_server_requests_seconds_sum` | Counter，秒 | 与 count 组合计算平均响应时间；不能直接把累计值当成当前延迟。 |
| `http_server_requests_active_seconds_count` | Gauge/长任务计数 | 观察当前活跃请求数量。 |
| `http_server_requests_active_seconds_max` | Gauge，秒 | 定位当前活跃请求中的最大耗时。 |

以下指标也常见于 Management 或 Flow Engine 端点，主要用于深入诊断，不建议仅根据单个绝对值配置紧急告警：

| 指标组 | 包含的指标 | 运维用途 |
| --- | --- | --- |
| 应用启动 | `application_started_time_seconds`、`application_ready_time_seconds` | 观察启动耗时的变化；重启后明显变慢时结合日志和依赖状态排查。 |
| 执行器 | `executor_active_threads`、`executor_pool_core_threads`、`executor_pool_max_threads`、`executor_pool_size_threads`、`executor_queued_tasks`、`executor_queue_remaining_tasks`、`executor_completed_tasks_total` | 判断线程池是否长期满载、队列是否持续增长。队列增长且剩余容量接近 0 时，再结合任务延迟和线程栈处理。 |
| JVM 类与编译 | `jvm_classes_loaded_classes`、`jvm_classes_unloaded_classes_total`、`jvm_compilation_time_ms_total`、`jvm_info` | 识别 JVM 和类加载趋势；通常用于解释内存或启动问题，不单独告警。 |
| JVM 缓冲区 | `jvm_buffer_count_buffers`、`jvm_buffer_memory_used_bytes`、`jvm_buffer_total_capacity_bytes` | 按缓冲区类型观察堆外内存的数量、使用量和容量。 |
| JVM GC 数据 | `jvm_gc_live_data_size_bytes`、`jvm_gc_max_data_size_bytes`、`jvm_gc_memory_allocated_bytes_total`、`jvm_gc_memory_promoted_bytes_total`、`jvm_gc_memory_usage_after_gc`、`jvm_gc_overhead` | 判断 GC 后存活数据、分配和晋升速度，以及 GC 时间占比；持续恶化且同时出现延迟或内存逼近上限时介入。 |
| JVM 线程补充 | `jvm_threads_daemon_threads`、`jvm_threads_started_threads_total` | 观察守护线程数量和线程创建速度；创建速度异常升高时检查连接或线程池抖动。 |
| 进程生命周期 | `process_cpu_time_ns_total`、`process_start_time_seconds`、`process_uptime_seconds` | 使用 `rate(process_cpu_time_ns_total[5m])` 查看 CPU 时间增长，通过启动时间和 uptime 识别非计划重启。 |
| 日志事件 | `ef_errors_log_total`、`log4j2_events_total` | 使用 `increase(...[5m])` 查看新出现的错误或不同级别日志；需结合标签和原始日志定位，不能把累计总数当作当前错误率。 |
| 定时任务 | `tasks_scheduled_execution_active_seconds`、`tasks_scheduled_execution_active_seconds_max`、`tasks_scheduled_execution_seconds`、`tasks_scheduled_execution_seconds_max` | 观察后台定时任务的执行次数、总耗时、当前活跃耗时和最大耗时；与同一实例历史基线比较。 |

Management 的平均请求耗时示例：

```promql
sum by (instance) (rate(http_server_requests_seconds_sum{job="tapdata-management"}[5m]))
/
sum by (instance) (rate(http_server_requests_seconds_count{job="tapdata-management"}[5m]))
```

文件句柄使用比例和 JVM Heap 使用比例示例：

```promql
process_files_open_files{job=~"tapdata-(management|flow-engine|agent)"}
/
process_files_max_files{job=~"tapdata-(management|flow-engine|agent)"}

sum by (project, job, instance) (jvm_memory_used_bytes{area="heap"})
/
sum by (project, job, instance) (jvm_memory_max_bytes{area="heap"} > 0)
```

### Agent

Agent 常见指标包括 `up`、`disk_free_bytes`、`disk_total_bytes`、`process_cpu_time_ns_total`、`process_cpu_usage`、`process_files_open_files`、`system_cpu_count`、`system_cpu_usage` 和 `system_load_average_1m`。其健康判断与上表相同；如果指标地址没有提供某个指标，不要使用数值 `0` 代替缺失数据。

### API Server

只有在 API Server `/metrics` 实际返回以下指标时，才应启用对应面板和规则。

| 指标 | 类型或单位 | 运维用途 |
| --- | --- | --- |
| `http_requests_total` | Counter | 按 `method`、`path`、`statusCode` 计算请求速率和非 2xx/5xx 比例。 |
| `nodejs_eventloop_lag_seconds` | Gauge，秒 | 持续升高通常表示同步计算、CPU 饱和或事件循环阻塞。 |
| `process_cpu_seconds_total` | Counter，秒 | 使用 `rate()` 查看进程 CPU 消耗趋势。 |
| `process_resident_memory_bytes` | Gauge，字节 | 进程常驻内存；应与容器或主机限制比较。 |
| `nodejs_heap_size_used_bytes`、`nodejs_heap_size_total_bytes` | Gauge，字节 | 查看 V8 Heap 使用量和增长趋势。 |
| `nodejs_external_memory_bytes` | Gauge，字节 | 查看由 V8 管理的外部内存。 |
| `nodejs_heap_space_size_used_bytes` | Gauge，字节 | 按 Heap Space 定位内存增长区域。 |
| `nodejs_gc_duration_seconds_count`、`nodejs_gc_duration_seconds_sum` | Counter | 使用 `rate()` 判断 GC 次数和耗时是否持续增加。 |
| `process_files_open_files` | Gauge | 查看进程打开的文件描述符数量。 |
| `log_level_count_total` | Counter | 使用 `increase()` 查看各日志级别在窗口内的新增数量。 |
| `nodejs_version_info` | Info | 识别实例、进程和 Node.js 版本，不作为告警阈值。 |

API 5xx 比例示例：

```promql
sum by (instance) (rate(http_requests_total{job="tapdata-api-server",statusCode=~"5.."}[5m]))
/
sum by (instance) (rate(http_requests_total{job="tapdata-api-server"}[5m]))
```

### MongoDB

MongoDB 指标名称取决于 `mongodb_exporter` 版本、兼容模式和启用的采集项（collector）。请以 exporter `/metrics` 输出为准。本文模板使用的核心指标如下：

| 指标 | 含义 | 健康判定与使用方式 |
| --- | --- | --- |
| `up{job="mongodb"}` | Prometheus 能否抓取 exporter。 | 应为 `1`；为 `0` 持续 2 分钟时检查 exporter 进程、网络和端口。 |
| `mongodb_up` | exporter 能否连接 MongoDB。 | 应为 `1`；`up=1` 但该值为 `0` 时检查系统库、URI、认证库、证书和网络。 |
| `mongodb_rs_myState` | 当前复制集成员状态。 | `1` PRIMARY、`2` SECONDARY、`7` ARBITER；其他状态持续存在时检查复制集。非复制集部署没有该指标。 |
| `mongodb_rs_members_state`、`mongodb_rs_members_health` | 各复制集成员的状态和健康值，包含 `member_idx`、`member_state` 等标签。 | 成员数和状态应与 `rs.status()` 一致；健康值应为 `1`。 |
| `mongodb_ss_connections` | 按 `conn_type` 区分当前、可用等连接数。 | 观察当前连接持续增长和可用连接持续下降；与实例规格和历史基线比较。 |
| `mongodb_ss_opcounters` | 按 `legacy_op_type` 区分的 MongoDB 操作累计次数。 | 使用 `rate()` 查看操作速率；突增应结合任务流量、延迟、连接和缓存判断。 |
| `mongodb_ss_wt_cache_bytes_currently_in_the_cache`、`mongodb_ss_wt_cache_maximum_bytes_configured` | WiredTiger 当前缓存使用量和配置上限。 | 比较使用量与上限；长期高位并伴随业务症状时进行容量评估。 |
| `mongodb_oplog_stats_storageStats_storageSize` | Oplog 当前存储大小。 | 只表示容量，不等于剩余时间窗口；计算窗口还需要最早、最新时间戳和写入速率。 |

MongoDB exporter 的配置方法参见[配置 MongoDB 监控](deployment.md#可选配置-mongodb-监控)，看板使用方法参见[判读 MongoDB 看板](grafana.md#判读-mongodb-看板)。

## 起始健康阈值

| 信号 | 健康或观察状态 | Warning 起点 | Critical 起点 | 首要排查方向 |
| --- | --- | --- | --- | --- |
| `up` | `1` | 不适用 | `0` 持续 2 分钟 | 目标、网络、端口、进程、指标路径。 |
| `mongodb_up` | `1` | 不适用 | `0` 持续 2 分钟 | 系统库状态、URI、认证库、证书和网络。 |
| MongoDB 复制集状态 | PRIMARY、SECONDARY 或 ARBITER | 其他状态持续 5 分钟 | 按业务影响升级 | 复制集状态、MongoDB 日志、节点网络和磁盘。 |
| 磁盘可用比例 | 大于 20%，且下降速度稳定 | 小于 20% 持续 15 分钟 | 小于 10% 持续 5 分钟 | 日志、临时文件、备份、数据增长；确认归属后再清理。 |
| 主机 CPU | 低于 85% 或短时尖峰 | 5 分钟均值大于 85%，持续 15 分钟 | 5 分钟均值大于 95%，持续 5 分钟 | 热点任务、GC、其他进程、扩容。 |
| 系统负载 | 与 CPU 核数及历史基线相符 | 长期高于 CPU 核数 | 同时出现延迟、错误或不可用 | CPU、I/O 等待、阻塞线程。 |
| JVM/Node.js 内存 | 峰值后能够回落 | 持续增长且接近限制 | OOM、重启或业务异常 | 内存限制、任务并发、泄漏、Heap/Direct Memory。 |
| 文件句柄 | 在历史区间内波动 | 持续增长 | 接近系统限制或打开文件失败 | 连接泄漏、文件操作、`ulimit`。 |
| API 5xx 比例 | 接近 0 | 有流量时超过 5% 持续 10 分钟 | 超过 20% 持续 5 分钟 | 接口路径、依赖服务、日志和最近变更。 |

### 建立环境基线

上线后的第一周，至少按业务平峰和高峰分别记录任务延迟、节点处理耗时、CPU、内存、GC、磁盘增长和 API 流量。随后以任务 SLA 和历史分位数调整规则，避免两种常见问题：阈值过低导致值班人员忽略告警，阈值过高导致业务已经受影响才收到通知。

每次真实事件后应复盘：告警是否过早、过晚、重复，通知中是否缺少任务、实例和排查链接。阈值调整应进入变更记录，而不是直接在生产文件中临时修改。
