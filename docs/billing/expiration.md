# 到期影响

import Content from '../reuse-content/_cloud-features.md';

<Content />

为避免影响业务，建议您在包年/包月实例到期前[续费实例](renew-subscribe.md)，或者在订阅实例时选择连续包年/包月的支付方式。



订阅的 Agent 实例到期后，相关的影响如下：

* 与该 Agent 关联的任务可继续运行，但无法执行该任务中的定时调度策略。
* 与该 Agent 关联的数据源，无法执行加载 Schema 操作。
* 配置新任务时，如关联该 Agent，无法启动任务。
* 添加数据源时，如关联该 Agent，无法执行测试连接操作。