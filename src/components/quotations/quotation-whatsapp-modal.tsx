import { useState, useMemo, useEffect } from "react";
import {
  MessageCircle,
  Copy,
  Check,
  Send,
  Phone,
  Building2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { Quotation } from "@/lib/api";

interface QuotationWhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotation: Quotation | null;
  defaultPhone?: string;
}

/**
 * Sanitize and format phone number for WhatsApp direct URL scheme.
 * Converts local Pakistani formats (03xx, +923xx, 3xx) to 923xxxxxxxxx.
 */
export function sanitizePhoneForWhatsApp(phone: string): string {
  if (!phone) return "";
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }
  // Local Pakistan format: 03001234567 -> 923001234567
  if (cleaned.startsWith("03") && cleaned.length === 11) {
    cleaned = "92" + cleaned.slice(1);
  }
  // Local Pakistan format without leading 0: 3001234567 -> 923001234567
  if (cleaned.startsWith("3") && cleaned.length === 10) {
    cleaned = "92" + cleaned;
  }
  return cleaned;
}

export function QuotationWhatsAppModal({
  open,
  onOpenChange,
  quotation,
  defaultPhone = "",
}: QuotationWhatsAppModalProps) {
  const [phoneNumber, setPhoneNumber] = useState(defaultPhone);
  const [customMessage, setCustomMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Auto-detect phone number from quotation when available
  useEffect(() => {
    if (quotation) {
      const detected =
        defaultPhone ||
        (quotation["contact_mobile"] as string) ||
        (quotation["mobile_no"] as string) ||
        (quotation["phone"] as string) ||
        "";
      setPhoneNumber(detected);
    }
  }, [quotation, defaultPhone]);

  // Generate formatted message text
  const generatedMessage = useMemo(() => {
    if (!quotation) return "";

    const customerName =
      quotation.party_name || quotation.customer_name || "Valued Customer";
    const qtnId = quotation.name;
    const grandTotal = Number(quotation.grand_total || 0).toLocaleString("en-PK");
    const validTill = quotation.valid_till || "upon confirmation";
    const items = quotation.items || [];
    const currency = quotation.currency || "PKR";

    const itemsSummary = items
      .map((item, idx) => {
        const itemName = item.item_name || item.item_code;
        const qty = item.qty || 1;
        const uom = item.uom || item.stock_uom || "Unit";
        const rate = Number(item.rate || 0).toLocaleString("en-PK");
        const amount = Number(item.amount || item.qty * item.rate || 0).toLocaleString("en-PK");
        return `${idx + 1}. *${itemName}* — ${qty} ${uom} @ ${currency} ${rate} = ${currency} ${amount}`;
      })
      .join("\n");

    return (
      `Dear *${customerName}*,\n\n` +
      `Please find below quotation *${qtnId}* from AgroCRM:\n\n` +
      `📋 *Total Items:* ${items.length}\n` +
      `💰 *Grand Total:* ${currency} ${grandTotal}\n` +
      `📅 *Valid Until:* ${validTill}\n\n` +
      (itemsSummary ? `*Item Summary:*\n${itemsSummary}\n\n` : "") +
      `Please reply to this message to confirm your order.\n\n` +
      `Thank you for your business,\n` +
      `*AgroCRM Team*`
    );
  }, [quotation]);

  // Sync customMessage with generatedMessage whenever template or quotation changes
  useEffect(() => {
    setCustomMessage(generatedMessage);
  }, [generatedMessage]);

  const sanitizedPhone = sanitizePhoneForWhatsApp(phoneNumber);
  const isValidPhone = sanitizedPhone.length >= 10;

  function handleSendWhatsApp() {
    if (!customMessage.trim()) {
      toast.error("Message cannot be empty");
      return;
    }

    const encodedText = encodeURIComponent(customMessage);
    // If phone number is provided, direct to user; otherwise open WhatsApp text composer
    const url = sanitizedPhone
      ? `https://wa.me/${sanitizedPhone}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;

    window.open(url, "_blank", "noopener,noreferrer");
    toast.success("Opening WhatsApp...");
    onOpenChange(false);
  }

  function handleCopy() {
    if (!customMessage.trim()) return;
    void navigator.clipboard.writeText(customMessage);
    setCopied(true);
    toast.success("Quotation message copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  if (!quotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border bg-card">
        {/* Header with WhatsApp styling */}
        <div className="bg-[#128C7E] dark:bg-[#075E54] text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-white/15 flex items-center justify-center text-white shadow-xs">
              <MessageCircle className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <span>Share Quotation via WhatsApp</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono font-normal">
                  {quotation.name}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-white/80 mt-0.5">
                Send formal quotation directly to client on WhatsApp
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Phone Number Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Phone className="size-3.5 text-muted-foreground" />
                Customer Mobile Number
              </Label>
              {sanitizedPhone && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  Target: +{sanitizedPhone}
                </span>
              )}
            </div>
            <div className="relative">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="03001234567 or 923001234567"
                className="font-mono text-sm pl-3 pr-24 h-9"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isValidPhone ? (
                  <Badge variant="outline" className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10 py-0">
                    Valid
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground">Optional</span>
                )}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Pakistani numbers (03xx) automatically convert to international WhatsApp format (923xx).
            </p>
          </div>

          {/* Editable Live Message Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-muted-foreground">
                Message Preview (Editable):
              </Label>
              <button
                type="button"
                onClick={() => setCustomMessage(generatedMessage)}
                className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
              >
                Reset to default
              </button>
            </div>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={8}
              className="font-sans text-xs leading-relaxed resize-none p-3 bg-muted/20 border-border/80 rounded-xl"
              placeholder="Quotation text preview..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <DialogFooter className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 flex flex-row items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs gap-1.5 h-9 font-medium"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span>Copy Text</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSendWhatsApp}
            className="text-xs gap-1.5 h-9 font-semibold bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-xs cursor-pointer px-4"
          >
            <Send className="size-3.5" />
            <span>Open in WhatsApp</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
