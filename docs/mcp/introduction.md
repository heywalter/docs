# MCP Server 介绍

import Content from '../reuse-content/_enterprise-and-community-features.md';

<Content />

**MCP（Model Context Protocol）** 是一种模型上下文协议，用于将结构化业务数据实时提供给 AI 模型，提升其对业务语境的理解能力。基于 **TapData** 提供的 MCP 服务，您可以将来自多个异构系统的数据整合、脱敏并发布为实时上下文视图，供 LLM（大语言模型）或 AI Agent 动态拉取。该方案特别适用于对数据时效性与合规性要求高的企业场景，如金融风控、智能客服、个性化推荐等。

## 背景介绍

随着企业数字化转型的加速，越来越多的企业开始使用 AI 模型进行实时业务决策，然而在实际应用中，却面临着下述问题：

- AI 模型通常缺乏实时业务数据的有效输入，导致推理准确性不足和幻觉问题。
- 企业的数据通常分散于不同的系统，如客户关系管理（CRM）、核心银行系统、企业资源计划（ERP）等，形成数据孤岛问题。
- 受限于数据安全和合规要求，AI 模型通常无法直接访问原始数据库。

![TapData MCP Server 工作原理介绍](../images/tapdata_mcp_server_introduction.png)

为解决这些问题，TapData 提供了 MCP 服务，通过标准化的 SSE 协议，结合实时物化视图与数据脱敏加工能力，将结构化上下文实时、安全、高效地推送给 AI 模型。模型**无需直连**数据库，即可精准获取业务数据上下文，显著提升推理准确性，加速 AI 能力在企业中的可信落地，构建统一的“AI 上下文服务层”。

## 功能优势

* **实时加速，查询性能百倍提升**

  基于 TapData 的数据缓存与[实时物化视图](../tapflow/tapflow-tutorial/build-real-time-wide-table.md)能力，AI 查询无需直连源库，实现毫秒级查询响应，显著加速上下文获取与模型推理效率。

* **安全访问，保障上下文可信可控**

  支持字段级[脱敏](../user-guide/advanced-settings/custom-node.md)与[权限管理](../user-guide/manage-system/manage-role.md)，结合实时同步与增量处理机制，确保 AI 在使用过程中安全、合规地访问最新数据。

* **一站连接，支持上百种数据源**

  仅需单个 MCP 服务即可连接 [100+ 异构数据源](../prerequisites/supported-databases.md)，全面覆盖主流数据库、SaaS 系统等，打通数据孤岛，为上下文生成与多场景推理提供可靠的数据基础。

* **适配智能体生态，快速集成主流模型**

  提供标准化 SSE 协议以及无代码配置的 [REST API](../user-guide/data-service/README.md) 接口，兼容 Cursor、Claude 等主流智能体工具链，快速赋能 LLM 与企业数据融合。

## 场景示例

本视频演示了如何结合 TapData MCP 自动获取业务上下文，包括结构解析、常见查询和实时宽表加速，帮助您直观了解其在性能与数据安全方面的优势。

<video
  src="/video/tapdata-mcp-demo.mp4"
  poster="/video/tapdata-mcp-cover.jpg"   // 封面图
  width="100%"
  height="500"
  controls
  preload="none"
  style={{borderRadius: '8px'}} />


## 了解更多

- [快速上手 TapData MCP Server](quick-start.md)