"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  defaultOrderFormData,
  type OrderFormData,
  type ServiceId,
  type StoredOrder,
} from "@/lib/order-types";
import {
  contactStepSchema,
  servicesStepSchema,
  scheduleStepSchema,
} from "@/lib/validators";
import {
  saveOrderDraft,
  loadOrderDraft,
  getAvailablePickupDates,
  formatDisplayDate,
  apiOrderToStored,
  buildOrderPayload,
  clearOrderDraft,
} from "@/lib/order-storage";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { useServices } from "@/hooks/useServices";
import { calculateEstimatedTotal } from "@/lib/pricing";
import { StepIndicator } from "./StepIndicator";
import { PhoneInput } from "./PhoneInput";
import { LocationPicker } from "./LocationPicker";
import {
  applyLocationToForm,
  deliveryLocationFromForm,
  locationFromForm,
} from "@/lib/order-types";
import { ServiceSelector } from "./ServiceSelector";
import { OrderSummary } from "./OrderSummary";
import { OrderConfirmation } from "./OrderConfirmation";
import { PaymentSelector } from "./PaymentSelector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { TIME_SLOT_LABELS } from "@/lib/order-types";
import { ArrowLeft, ArrowRight, LogIn } from "lucide-react";

const TOTAL_STEPS = 4;

function buildInitialOrderData(
  serviceParam: ServiceId | null,
  options?: { includeDraft?: boolean },
): OrderFormData {
  const draft = options?.includeDraft ? loadOrderDraft() : null;
  let initial: OrderFormData = { ...defaultOrderFormData, ...draft };

  if (
    serviceParam &&
    (["wash_fold", "duvet_king_queen", "double_duvet"] as ServiceId[]).includes(
      serviceParam,
    )
  ) {
    const exists = initial.services.some((s) => s.serviceId === serviceParam);
    if (!exists) {
      initial = {
        ...initial,
        services: [...initial.services, { serviceId: serviceParam, quantity: 1 }],
      };
    }
  }

  const dates = getAvailablePickupDates();
  if (!initial.pickupDate) {
    initial.pickupDate = dates[0];
  }

  return initial;
}

function getStepErrors(
  step: number,
  data: OrderFormData,
): Record<string, string> {
  let result;

  switch (step) {
    case 1:
      result = contactStepSchema.safeParse(data);
      break;
    case 2:
      result = servicesStepSchema.safeParse(data);
      break;
    case 3:
      result = scheduleStepSchema.safeParse(data);
      break;
    default:
      return {};
  }

  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0]?.toString() ?? "form";
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export function OrderWizard() {
  const searchParams = useSearchParams();
  const serviceParam = searchParams.get("service") as ServiceId | null;
  const {
    profile,
    loading: authLoading,
    signIn,
    signInError,
    signInLoading,
    getToken,
    refreshProfile,
    isConfigured,
  } =
    useAuth();
  const { services } = useServices();

  const [step, setStep] = useState(1);
  const [data, setData] = useState<OrderFormData>(() =>
    buildInitialOrderData(serviceParam, { includeDraft: false }),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submittedOrder, setSubmittedOrder] = useState<StoredOrder | null>(null);
  const [quoteTotal, setQuoteTotal] = useState<number | null>(null);
  const [depositAmount, setDepositAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const draft = loadOrderDraft();
    if (draft) {
      setData(buildInitialOrderData(serviceParam, { includeDraft: true }));
    }
  }, [serviceParam]);
  useEffect(() => {
    saveOrderDraft(data);
  }, [data]);

  useEffect(() => {
    if (authLoading) return;

    if (profile?.profile_complete) {
      const addr = profile.default_address;
      setData((prev) => ({
        ...prev,
        firstName: profile.first_name ?? prev.firstName,
        lastName: profile.last_name ?? prev.lastName,
        phone: profile.phone ?? prev.phone,
        email: profile.email ?? prev.email,
        area: addr?.area ?? prev.area,
        landmark: addr?.address_line ?? prev.landmark,
        formattedAddress: addr?.formatted_address ?? prev.formattedAddress,
        placeId: addr?.place_id ?? prev.placeId,
        latitude: addr?.latitude != null ? Number(addr.latitude) : prev.latitude,
        longitude: addr?.longitude != null ? Number(addr.longitude) : prev.longitude,
        paymentMethod: profile.is_burned ? "mpesa" : prev.paymentMethod,
      }));
      setStep(2);
    } else if (profile && !profile.profile_complete) {
      setData((prev) => ({
        ...prev,
        email: profile.email ?? prev.email,
        firstName: profile.first_name ?? prev.firstName,
        lastName: profile.last_name ?? prev.lastName,
      }));
    }
  }, [profile, authLoading]);

  useEffect(() => {
    if (data.services.length === 0) return;
    getToken()
      .then((t) =>
        api.quoteOrder(t, {
          services: data.services.map((s) => ({
            service_id: s.serviceId,
            quantity: s.quantity,
          })),
          estimated_weight_kg: data.estimatedWeightKg,
        }),
      )
      .then((q) => {
        setQuoteTotal(q.estimated_total);
        setDepositAmount(q.deposit_amount);
        if (q.requires_deposit) {
          setData((prev) => ({ ...prev, paymentMethod: "mpesa" }));
        }
      })
      .catch(() => {
        setQuoteTotal(calculateEstimatedTotal(data, services));
      });
  }, [data.services, data.estimatedWeightKg, getToken, services, data]);

  const updateData = useCallback((updates: Partial<OrderFormData>) => {
    setData((prev) => ({ ...prev, ...updates }));
    setErrors({});
  }, []);

  const goNext = () => {
    const stepErrors = getStepErrors(step, data);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  };

  const goBack = () => {
    setErrors({});
    const minStep = profile?.profile_complete ? 2 : 1;
    setStep((s) => Math.max(s - 1, minStep));
  };

  const handleSubmit = async () => {
    const allErrors = {
      ...getStepErrors(1, data),
      ...getStepErrors(2, data),
      ...getStepErrors(3, data),
    };
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const token = await getToken();
      if (!token) {
        setSubmitError("Please sign in with Google to place your order.");
        setSubmitting(false);
        return;
      }

      if (!profile?.profile_complete) {
        await api.updateMe(token, {
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
        });
        await refreshProfile();
      }

      const order = await api.createOrder(token, buildOrderPayload(data));
      clearOrderDraft();

      if (
        order.status === "pending_payment" ||
        order.status === "pending_deposit"
      ) {
        await api.stkPush(token, { order_id: order.id, phone: data.phone });
      }

      setSubmittedOrder(apiOrderToStored(order, data));
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Failed to place order. Try again.";
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedOrder) {
    return <OrderConfirmation order={submittedOrder} />;
  }

  const pickupDates = getAvailablePickupDates();
  const estimatedTotal = quoteTotal ?? calculateEstimatedTotal(data, services);
  const isBurned = profile?.is_burned ?? false;
  const showPhoneOnly =
    profile && !profile.profile_complete && profile.email && step === 1;

  return (
    <div className="pb-24">
      <StepIndicator currentStep={step} />

      {isBurned && (
        <div className="mx-4 mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3 text-sm text-amber-200">
          Deposit required before we accept your order.
        </div>
      )}

      {!authLoading && isConfigured && !profile && (
        <div className="mx-4 mb-4 rounded-xl border border-border bg-surface p-4">
          <p className="text-sm text-muted">
            Sign in with Google to save your details and order faster next time.
          </p>
          {signInError && (
            <p className="mt-2 text-sm text-red-300">{signInError}</p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            loading={signInLoading}
            loadingText="Sign in with Google"
            overlay={false}
            onClick={() => void signIn()}
          >
            <LogIn className="h-4 w-4" />
            Sign in with Google
          </Button>
        </div>
      )}

      <div className="px-4">
        {step === 1 && !showPhoneOnly && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Contact details</h1>
              <p className="mt-1 text-sm text-muted">
                We&apos;ll use this to coordinate your pickup.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" required>
                  First name
                </Label>
                <Input
                  id="firstName"
                  placeholder="Jane"
                  autoComplete="given-name"
                  value={data.firstName}
                  onChange={(e) => updateData({ firstName: e.target.value })}
                  error={errors.firstName}
                />
              </div>
              <div>
                <Label htmlFor="lastName" required>
                  Last name
                </Label>
                <Input
                  id="lastName"
                  placeholder="Wanjiku"
                  autoComplete="family-name"
                  value={data.lastName}
                  onChange={(e) => updateData({ lastName: e.target.value })}
                  error={errors.lastName}
                />
              </div>
            </div>
            <PhoneInput
              value={data.phone}
              onChange={(phone) => updateData({ phone })}
              error={errors.phone}
            />
            <div>
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jane@example.com"
                autoComplete="email"
                value={data.email}
                onChange={(e) => updateData({ email: e.target.value })}
                error={errors.email}
              />
            </div>
            <LocationPicker
              label="Pickup location"
              value={locationFromForm(data)}
              onChange={(location) => updateData(applyLocationToForm(data, location, "pickup"))}
              error={errors.latitude}
            />
          </div>
        )}

        {step === 1 && showPhoneOnly && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Complete your profile</h1>
              <p className="mt-1 text-sm text-muted">
                Phone and pickup location for coordination.
              </p>
            </div>
            <PhoneInput
              value={data.phone}
              onChange={(phone) => updateData({ phone })}
              error={errors.phone}
            />
            <LocationPicker
              label="Pickup location"
              value={locationFromForm(data)}
              onChange={(location) => updateData(applyLocationToForm(data, location, "pickup"))}
              error={errors.latitude}
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-4">
              <h1 className="text-xl font-bold text-foreground">Select services</h1>
              <p className="mt-1 text-sm text-muted">
                Choose what you need cleaned.
              </p>
            </div>
            <ServiceSelector
              data={data}
              onChange={updateData}
              errors={errors}
              estimatedTotal={estimatedTotal}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Schedule pickup</h1>
              <p className="mt-1 text-sm text-muted">
                Pick a convenient time for collection.
              </p>
            </div>
            <div>
              <Label htmlFor="pickupDate" required>
                Pickup date
              </Label>
              <Select
                id="pickupDate"
                value={data.pickupDate}
                onChange={(e) => updateData({ pickupDate: e.target.value })}
                error={errors.pickupDate}
              >
                {pickupDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDisplayDate(date)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="pickupTimeSlot" required>
                Time slot
              </Label>
              <Select
                id="pickupTimeSlot"
                value={data.pickupTimeSlot}
                onChange={(e) =>
                  updateData({
                    pickupTimeSlot: e.target.value as OrderFormData["pickupTimeSlot"],
                  })
                }
              >
                {Object.entries(TIME_SLOT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="glass-card rounded-2xl p-4">
              <Label>Delivery address</Label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={data.sameDeliveryAddress}
                    onChange={() => updateData({ sameDeliveryAddress: true })}
                    className="accent-accent-start"
                  />
                  <span className="text-sm text-foreground/90">Same as pickup address</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!data.sameDeliveryAddress}
                    onChange={() => updateData({ sameDeliveryAddress: false })}
                    className="accent-accent-start"
                  />
                  <span className="text-sm text-foreground/90">Different address</span>
                </label>
              </div>
            </div>

            {!data.sameDeliveryAddress && (
              <LocationPicker
                label="Delivery location"
                value={deliveryLocationFromForm(data)}
                onChange={(location) =>
                  updateData(applyLocationToForm(data, location, "delivery"))
                }
                error={errors.deliveryLatitude}
              />
            )}

            <div>
              <Label htmlFor="deliveryDate">Preferred delivery date (optional)</Label>
              <Select
                id="deliveryDate"
                value={data.deliveryDate}
                onChange={(e) => updateData({ deliveryDate: e.target.value })}
              >
                <option value="">No preference</option>
                {pickupDates.map((date) => (
                  <option key={date} value={date}>
                    {formatDisplayDate(date)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-xl font-bold text-foreground">Review & submit</h1>
              <p className="mt-1 text-sm text-muted">
                Confirm your order details before submitting.
              </p>
            </div>
            <OrderSummary data={data} estimatedTotal={estimatedTotal} />
            <PaymentSelector
              value={data.paymentMethod}
              onChange={(paymentMethod) => updateData({ paymentMethod })}
              isBurned={isBurned}
              depositAmount={depositAmount}
              estimatedTotal={estimatedTotal}
            />
            {submitError && (
              <p className="text-sm text-red-400">{submitError}</p>
            )}
          </div>
        )}

        <div className="relative z-20 mt-8 flex gap-3">
          {step > (profile?.profile_complete ? 2 : 1) && (
            <Button variant="secondary" size="lg" onClick={goBack} className="flex-1">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button variant="primary" size="lg" onClick={goNext} className="flex-1">
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="accent"
              size="lg"
              onClick={handleSubmit}
              className="flex-1"
              loading={submitting}
              loadingText="Placing order"
              disabled={isBurned && data.paymentMethod === "cod"}
            >
              Place order
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
