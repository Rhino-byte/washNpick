"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, MessageSquare, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  api,
  ApiError,
  type ApiStaffMessagingAnalytics,
  type ApiWhatsappConversationDetail,
  type ApiWhatsappConversationSummary,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DottedSpinner } from "@/components/ui/DottedSpinner";

type RangeTab = "24h" | "7d";

function rangeDates(tab: RangeTab): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setHours(from.getHours() - (tab === "24h" ? 24 : 24 * 7));
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export function StaffMessagesDashboard() {
  const { getToken } = useAuth();
  const [range, setRange] = useState<RangeTab>("7d");
  const [analytics, setAnalytics] = useState<ApiStaffMessagingAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [conversations, setConversations] = useState<ApiWhatsappConversationSummary[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiWhatsappConversationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);
  const [error, setError] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [botPrompt, setBotPrompt] = useState("");
  const [botPromptLoading, setBotPromptLoading] = useState(true);
  const [botPromptSaving, setBotPromptSaving] = useState(false);
  const [botPromptMeta, setBotPromptMeta] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResult, setPreviewResult] = useState("");

  const loadBotConfig = useCallback(async () => {
    setBotPromptLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const config = await api.getStaffBotConfig(token);
      setBotPrompt(config.system_prompt);
      if (config.updated_at) {
        const when = new Date(config.updated_at).toLocaleString();
        setBotPromptMeta(
          config.updated_by_name
            ? `Last updated by ${config.updated_by_name} · ${when}`
            : `Last updated · ${when}`,
        );
      } else {
        setBotPromptMeta("Using default prompt");
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load bot prompt");
    } finally {
      setBotPromptLoading(false);
    }
  }, [getToken]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;
      const dates = rangeDates(range);
      const data = await api.getStaffMessagingAnalytics(token, dates);
      setAnalytics(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load analytics");
    } finally {
      setAnalyticsLoading(false);
    }
  }, [getToken, range]);

  const loadConversations = useCallback(async () => {
    setConversationsLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await api.listStaffConversations(token);
      setConversations(data);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load conversations");
    } finally {
      setConversationsLoading(false);
    }
  }, [getToken]);

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const data = await api.getStaffConversation(token, id);
        setDetail(data);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Failed to load conversation");
      } finally {
        setDetailLoading(false);
      }
    },
    [getToken],
  );

  useEffect(() => {
    void loadBotConfig();
    void loadAnalytics();
    void loadConversations();
  }, [loadBotConfig, loadAnalytics, loadConversations]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const handleReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    setReplyLoading(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;
      await api.replyStaffConversation(token, selectedId, replyText.trim());
      setReplyText("");
      await loadDetail(selectedId);
      await loadConversations();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to send reply");
    } finally {
      setReplyLoading(false);
    }
  };

  const handleClaim = async (escalationId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.patchStaffEscalation(token, escalationId, "claimed");
      if (selectedId) await loadDetail(selectedId);
      await loadConversations();
      await loadAnalytics();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to claim escalation");
    }
  };

  const handleResolve = async (escalationId: string) => {
    try {
      const token = await getToken();
      if (!token) return;
      await api.patchStaffEscalation(token, escalationId, "resolved");
      if (selectedId) await loadDetail(selectedId);
      await loadConversations();
      await loadAnalytics();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to resolve escalation");
    }
  };

  const handleTestSend = async () => {
    if (!testPhone.trim()) return;
    setTestLoading(true);
    setTestResult("");
    setError("");
    try {
      const token = await getToken();
      if (!token) return;
      const res = await api.sendStaffTestMessage(token, testPhone.trim());
      setTestResult(`Sent (${res.status}) — SID ${res.sid}`);
      await loadAnalytics();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Test send failed");
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveBotPrompt = async () => {
    if (!botPrompt.trim()) return;
    setBotPromptSaving(true);
    setError("");
    try {
      const token = await getToken();
      if (!token) return;
      const config = await api.updateStaffBotConfig(token, botPrompt.trim());
      if (config.updated_at) {
        const when = new Date(config.updated_at).toLocaleString();
        setBotPromptMeta(
          config.updated_by_name
            ? `Last updated by ${config.updated_by_name} · ${when}`
            : `Last updated · ${when}`,
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to save bot prompt");
    } finally {
      setBotPromptSaving(false);
    }
  };

  const handlePreviewBot = async () => {
    if (!previewMessage.trim()) return;
    setPreviewLoading(true);
    setPreviewResult("");
    setError("");
    try {
      const token = await getToken();
      if (!token) return;
      const result = await api.previewStaffBotConfig(token, {
        sample_message: previewMessage.trim(),
        system_prompt: botPrompt.trim() || undefined,
      });
      setPreviewResult(
        result.action === "escalate"
          ? `[Escalate${result.reason ? `: ${result.reason}` : ""}] ${result.message}`
          : result.message,
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const openEscalations = conversations.filter((c) => c.open_escalation_id);

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/staff"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted hover:text-foreground"
              aria-label="Back to orders"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-foreground">Messages</h1>
              <p className="text-sm text-muted">WhatsApp analytics & inbox</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            overlay={false}
            onClick={() => {
              void loadAnalytics();
              void loadConversations();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-6 px-4 py-4">
        {error && <p className="text-sm text-red-300">{error}</p>}

        <section className="glass-card space-y-3 rounded-xl p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Bot prompt</h2>
            <Button
              size="sm"
              loading={botPromptSaving}
              overlay={false}
              onClick={() => void handleSaveBotPrompt()}
            >
              Save
            </Button>
          </div>
          {botPromptLoading ? (
            <div className="flex justify-center py-6">
              <DottedSpinner />
            </div>
          ) : (
            <>
              <textarea
                value={botPrompt}
                onChange={(e) => setBotPrompt(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                placeholder="System prompt for GPT-4o mini…"
              />
              {botPromptMeta && <p className="text-xs text-muted">{botPromptMeta}</p>}
              <div className="space-y-2 border-t border-border pt-3">
                <p className="text-xs font-medium text-muted">Preview reply</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Sample customer message…"
                    value={previewMessage}
                    onChange={(e) => setPreviewMessage(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    loading={previewLoading}
                    overlay={false}
                    onClick={() => void handlePreviewBot()}
                  >
                    Preview
                  </Button>
                </div>
                {previewResult && (
                  <p className="rounded-lg bg-surface px-3 py-2 text-sm text-foreground">
                    {previewResult}
                  </p>
                )}
              </div>
            </>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Summary</h2>
            <div className="flex gap-2">
              {(["24h", "7d"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setRange(tab)}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    range === tab
                      ? "bg-accent-start text-white"
                      : "border border-border bg-surface text-muted"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          {analyticsLoading ? (
            <div className="flex justify-center py-6">
              <DottedSpinner />
            </div>
          ) : analytics ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Outbound", analytics.outbound.total],
                ["Delivered", analytics.outbound.delivered],
                ["Failed", analytics.outbound.failed],
                ["Inbound", analytics.inbound_count],
              ].map(([label, value]) => (
                <div key={label as string} className="glass-card rounded-xl p-3">
                  <p className="text-xs text-muted">{label}</p>
                  <p className="text-lg font-bold text-foreground">{value}</p>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="glass-card space-y-3 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-foreground">Test send (sandbox)</h2>
          <p className="text-xs text-muted">
            Phone must have joined the Twilio WhatsApp sandbox. Use 2547… format.
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="254712345678"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
            />
            <Button
              size="sm"
              loading={testLoading}
              overlay={false}
              onClick={() => void handleTestSend()}
            >
              Send
            </Button>
          </div>
          {testResult && <p className="text-xs text-green-400">{testResult}</p>}
        </section>

        {analytics && analytics.errors.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Error breakdown</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[480px] text-left text-xs">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Count</th>
                    <th className="px-3 py-2">Last seen</th>
                    <th className="px-3 py-2">Sample</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.errors.map((row) => (
                    <tr key={`${row.error_code}-${row.last_seen}`} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{row.error_code}</td>
                      <td className="px-3 py-2">{row.count}</td>
                      <td className="px-3 py-2 text-muted">
                        {row.last_seen ? new Date(row.last_seen).toLocaleString() : "—"}
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-muted">
                        {row.sample_message ?? row.error_message ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {openEscalations.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Escalation queue</h2>
            {openEscalations.map((conv) => (
              <div
                key={conv.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-foreground">{conv.customer_phone}</p>
                  <p className="truncate text-xs text-muted">{conv.last_message_preview}</p>
                </div>
                <div className="flex gap-2">
                  {conv.open_escalation_id && (
                    <Button
                      size="sm"
                      variant="outline"
                      overlay={false}
                      onClick={() => void handleClaim(conv.open_escalation_id!)}
                    >
                      Claim
                    </Button>
                  )}
                  <Button
                    size="sm"
                    overlay={false}
                    onClick={() => setSelectedId(conv.id)}
                  >
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Inbox</h2>
            {conversationsLoading ? (
              <div className="flex justify-center py-8">
                <DottedSpinner />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-sm text-muted">No conversations yet.</p>
            ) : (
              <ul className="space-y-2">
                {conversations.map((conv) => (
                  <li key={conv.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(conv.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        selectedId === conv.id
                          ? "border-accent-start bg-accent-start/10"
                          : "border-border bg-surface hover:border-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 shrink-0 text-muted" />
                        <span className="font-mono text-sm text-foreground">{conv.customer_phone}</span>
                        <span className="ml-auto text-xs capitalize text-muted">{conv.state}</span>
                      </div>
                      {conv.last_message_preview && (
                        <p className="mt-1 truncate text-xs text-muted">{conv.last_message_preview}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex min-h-[320px] flex-col rounded-xl border border-border bg-surface">
            {!selectedId ? (
              <p className="flex flex-1 items-center justify-center p-6 text-sm text-muted">
                Select a conversation
              </p>
            ) : detailLoading || !detail ? (
              <div className="flex flex-1 items-center justify-center">
                <DottedSpinner />
              </div>
            ) : (
              <>
                <div className="border-b border-border px-4 py-3">
                  <p className="font-mono text-sm text-foreground">{detail.customer_phone}</p>
                  {detail.order_id && (
                    <p className="text-xs text-muted">Order {detail.order_id}</p>
                  )}
                  {detail.escalations[0]?.status === "open" && detail.escalations[0] && (
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        overlay={false}
                        onClick={() => void handleClaim(detail.escalations[0].id)}
                      >
                        Claim
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        overlay={false}
                        onClick={() => void handleResolve(detail.escalations[0].id)}
                      >
                        Resolve
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-4">
                  {detail.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                        msg.direction === "outbound"
                          ? "ml-auto bg-accent-start/20 text-foreground"
                          : "bg-background text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <p className="mt-1 text-[10px] text-muted">
                        {new Date(msg.created_at).toLocaleString()}
                        {msg.twilio_status ? ` · ${msg.twilio_status}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 border-t border-border p-3">
                  <Input
                    placeholder="Reply on WhatsApp…"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleReply();
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    loading={replyLoading}
                    overlay={false}
                    onClick={() => void handleReply()}
                    aria-label="Send reply"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </>
            )}
          </div>
        </section>

        {analytics && analytics.recent_failures.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-foreground">Recent failures</h2>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Order</th>
                    <th className="px-3 py-2">Phone</th>
                    <th className="px-3 py-2">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recent_failures.map((row) => (
                    <tr key={row.id} className="border-t border-border">
                      <td className="px-3 py-2 text-muted">
                        {row.created_at ? new Date(row.created_at).toLocaleString() : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono">{row.order_id}</td>
                      <td className="px-3 py-2 font-mono">{row.recipient_phone}</td>
                      <td className="px-3 py-2">
                        <span className="font-mono">{row.error_code}</span>
                        {row.error_message && (
                          <span className="ml-1 text-muted">— {row.error_message}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
