import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import Toast from "react-native-toast-message";
import { supabase } from "../lib/supabase";
import { createGuard } from "../lib/createGuard";
import {
  useLanguage,
  WEEKDAYS,
  type Language,
  type TranslationKey,
} from "../lib/i18n";

const HOURS = Array.from({ length: 16 }, (_, i) => {
  const h = 8 + i;
  return [`${h}:00`, `${h}:30`];
}).flat();

const LOCATION_SUGGESTIONS = [
  "Center",
  "Blizu faksa",
  "Rožna",
  "Bežigrad",
  "Vič",
  "Šiška",
  "BTC",
];

const subtleCardShadow = {
  shadowColor: "#0F172A",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.05,
  shadowRadius: 8,
  elevation: 1,
} as const;

type ComposerStep = "location" | "day" | "time" | "visibility" | "note" | null;

function buildDayOptions(language: Language) {
  const options: { offset: number; label: string; sublabel: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const sublabel = `${day}.${month}.`;
    if (i === 0) options.push({ offset: 0, label: language === "en" ? "Today" : "Danes", sublabel });
    else if (i === 1) options.push({ offset: 1, label: language === "en" ? "Tomorrow" : "Jutri", sublabel });
    else {
      options.push({
        offset: i,
        label: WEEKDAYS[language][d.getDay()],
        sublabel,
      });
    }
  }
  return options;
}

function BoneAvatarBadge({
  photoUrl,
  initial,
}: {
  photoUrl: string | null;
  initial: string;
}) {
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: 56, height: 56, borderRadius: 28 }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View className="w-14 h-14 rounded-full bg-brand-light dark:bg-neutral-800 items-center justify-center">
      <Text className="font-bold text-lg text-brand-dark dark:text-brand">
        {initial}
      </Text>
    </View>
  );
}

type BoneComposerCardProps = {
  openSignal?: number;
  onSuccess?: () => void | Promise<void>;
};

export function BoneComposerCard({
  openSignal = 0,
  onSuccess,
}: BoneComposerCardProps) {
  const inputRef = useRef<TextInput>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [activeStep, setActiveStep] = useState<ComposerStep>(null);
  const [isLocationFocused, setIsLocationFocused] = useState(false);
  const [location, setLocation] = useState("");
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private" | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [buddyMatchIds, setBuddyMatchIds] = useState<string[]>([]);
  const [loadingBuddies, setLoadingBuddies] = useState(false);
  const [meId, setMeId] = useState<string | null>(null);
  const [mePhotoUrl, setMePhotoUrl] = useState<string | null>(null);
  const [meInitial, setMeInitial] = useState("B");
  const { language, t } = useLanguage();
  const dayOptions = useMemo(() => buildDayOptions(language), [language]);

  const availableTimes = useMemo(() => {
    if (selectedDate === null) return [];
    return HOURS.filter((timeSlot) => !isTimeSlotPast(selectedDate, timeSlot));
  }, [selectedDate]);

  const locationSuggestionsVisible =
    isOpen && activeStep === "location" && (isLocationFocused || !location.trim());

  const hasDraft = Boolean(
    location.trim() ||
      selectedDate !== null ||
      selectedTime ||
      visibility !== null ||
      note.trim()
  );

  const canSubmit = Boolean(
    location.trim() &&
      selectedDate !== null &&
      selectedTime &&
      visibility !== null &&
      getScheduledDate(selectedDate, selectedTime).getTime() > Date.now() &&
      (visibility === "public" || buddyMatchIds.length > 0) &&
      !loading
  );

  const dayLabel =
    selectedDate === null
      ? null
      : dayOptions.find((option) => option.offset === selectedDate)?.label ?? null;

  useEffect(() => {
    if (!openSignal) return;
    openComposer(true);
  }, [openSignal]);

  useEffect(() => {
    createGuard.dirty = hasDraft;
  }, [hasDraft]);

  useEffect(() => {
    createGuard.reset = () => resetComposer();
    return () => {
      createGuard.reset = null;
      createGuard.dirty = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function loadProfileAndBuddies() {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data: me } = await supabase
          .from("profiles")
          .select("id, name, photos")
          .eq("user_id", user.id)
          .single();

        if (!me || cancelled) return;

        setMeId(me.id);
        setMePhotoUrl(me.photos?.[0] ?? null);
        setMeInitial((me.name?.trim()?.[0] ?? "B").toUpperCase());
        setLoadingBuddies(true);
        try {
          const { data: matches } = await supabase
            .from("buddy_matches")
            .select("id, user1_id, user2_id")
            .or(`user1_id.eq.${me.id},user2_id.eq.${me.id}`);

          const matchRows = matches ?? [];
          const otherProfileIds = matchRows.map((match) =>
            match.user1_id === me.id ? match.user2_id : match.user1_id
          );

          const { data: blockedUsers } = otherProfileIds.length
            ? await supabase
                .from("blocked_users")
                .select("blocker_id, blocked_id")
                .or(`blocker_id.eq.${me.id},blocked_id.eq.${me.id}`)
            : { data: [] as { blocker_id: string; blocked_id: string }[] };

          const { data: visibleProfiles } = otherProfileIds.length
            ? await supabase
                .from("profiles")
                .select("id")
                .in("id", otherProfileIds)
            : { data: [] as { id: string }[] };

          const blockedProfileIds = new Set(
            (blockedUsers ?? [])
              .map((blockedUser) =>
                blockedUser.blocker_id === me.id
                  ? blockedUser.blocked_id
                  : blockedUser.blocked_id === me.id
                    ? blockedUser.blocker_id
                    : null
              )
              .filter(
                (profileId): profileId is string =>
                  profileId !== null && otherProfileIds.includes(profileId)
              )
          );
          const visibleProfileIds = new Set(
            (visibleProfiles ?? []).map((profile) => profile.id)
          );

          if (!cancelled) {
            setBuddyMatchIds(
              matchRows
                .filter((match) => {
                  const otherId =
                    match.user1_id === me.id ? match.user2_id : match.user1_id;
                  return (
                    visibleProfileIds.has(otherId) &&
                    !blockedProfileIds.has(otherId)
                  );
                })
                .map((match) => match.id)
            );
          }
        } finally {
          if (!cancelled) setLoadingBuddies(false);
        }
      }

      void loadProfileAndBuddies();

      return () => {
        cancelled = true;
      };
    }, [])
  );

  useEffect(() => {
    if (selectedDate === null || !selectedTime) return;
    if (!isTimeSlotPast(selectedDate, selectedTime)) return;
    setSelectedTime("");
  }, [selectedDate, selectedTime]);

  function openComposer(focusInput = false) {
    setIsOpen(true);
    setActiveStep(getNextIncompleteStep({ location, selectedDate, selectedTime, visibility }));
    if (!focusInput) return;

    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }

  function resetComposer() {
    setLocation("");
    setSelectedDate(null);
    setSelectedTime("");
    setVisibility(null);
    setNote("");
    setIsOpen(false);
    setActiveStep(null);
    setIsLocationFocused(false);
    createGuard.dirty = false;
  }

  function advanceAfterLocation() {
    if (!location.trim()) return;
    setActiveStep(selectedDate === null ? "day" : getNextIncompleteStep({
      location,
      selectedDate,
      selectedTime,
      visibility,
    }));
    setIsLocationFocused(false);
    inputRef.current?.blur();
  }

  function handleSuggestionPress(suggestion: string) {
    setLocation(suggestion);
    setIsLocationFocused(false);
    inputRef.current?.blur();
    setIsOpen(true);
    setActiveStep(selectedDate === null ? "day" : getNextIncompleteStep({
      location: suggestion,
      selectedDate,
      selectedTime,
      visibility,
    }));
  }

  function handleSelectDay(offset: number) {
    setSelectedDate(offset);
    setSelectedTime("");
    setActiveStep("time");
  }

  function handleSelectTime(timeSlot: string) {
    setSelectedTime(timeSlot);
    setActiveStep(visibility === null ? "visibility" : null);
  }

  function handleSelectVisibility(nextVisibility: "public" | "private") {
    setVisibility(nextVisibility);
    setActiveStep(null);
  }

  async function submit() {
    const trimmedLocation = location.trim();
    if (!trimmedLocation) {
      return Toast.show({ type: "error", text1: t("composer.enterLocation") });
    }
    if (selectedDate === null || !selectedTime) {
      return Toast.show({ type: "error", text1: t("composer.chooseSlot") });
    }
    if (!visibility) {
      return Toast.show({ type: "error", text1: t("composer.chooseVisibilityToast") });
    }

    const scheduledDate = getScheduledDate(selectedDate, selectedTime);
    if (scheduledDate.getTime() <= Date.now()) {
      return Toast.show({
        type: "error",
        text1: t("composer.timePast"),
        text2: t("composer.chooseFuture"),
      });
    }

    if (!meId) {
      return Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("composer.profileUnavailable"),
      });
    }

    setLoading(true);
    try {
      const scheduledAt = scheduledDate.toISOString();

      if (visibility === "private") {
        if (buddyMatchIds.length === 0) {
          return Toast.show({
            type: "error",
            text1: t("composer.noBuddies"),
          });
        }

        const { error } = await supabase.rpc("create_private_meal_invites", {
          p_match_ids: buddyMatchIds,
          p_restaurant: trimmedLocation,
          p_restaurant_info: null,
          p_scheduled_at: scheduledAt,
          p_note: note.trim() || null,
        });
        if (error) throw error;

        resetComposer();
        await onSuccess?.();
        Toast.show({
          type: "success",
          text1: t("composer.published"),
          text2: t("composer.buddiesSee"),
        });
        return;
      }

      const { error } = await supabase.from("meal_invites").insert({
        user_id: meId,
        restaurant: trimmedLocation,
        restaurant_info: null,
        scheduled_at: scheduledAt,
        note: note.trim() || null,
        visibility: "public",
        status: "open",
      });
      if (error) throw error;

      resetComposer();
      await onSuccess?.();
      Toast.show({
        type: "success",
        text1: t("composer.published"),
        text2: t("composer.bonPublished"),
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getBoneCreateErrorMessage(error, t),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      style={subtleCardShadow}
      className={`rounded-3xl px-4 py-3.5 mb-4 ${
        isOpen
          ? "bg-[#F8FCFF] dark:bg-neutral-900 border border-[#B7E2FA] dark:border-neutral-700"
          : "bg-white dark:bg-neutral-900 border border-transparent"
      }`}
    >
      <View className="flex-row items-center">
        <Pressable onPress={() => openComposer(true)} className="shrink-0">
          <BoneAvatarBadge photoUrl={mePhotoUrl} initial={meInitial} />
        </Pressable>

        <View className="flex-1 ml-3 min-w-0">
          <View className="flex-row items-center">
            <Pressable
              onPress={() => openComposer(true)}
              className="flex-1 min-w-0"
            >
              <Text
                className="font-bold text-base text-gray-900 dark:text-white"
                numberOfLines={1}
              >
                {t("composer.createBon")}
              </Text>
            </Pressable>

            <View
              className="ml-2 flex-row items-center shrink-0"
              style={{ gap: 8 }}
            >
              {isOpen ? (
                <Pressable onPress={resetComposer}>
                  <Text className="text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                    {t("composer.cancel")}
                  </Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={() => {
                  if (!isOpen) {
                    openComposer(true);
                    return;
                  }
                  if (!canSubmit) return;
                  void submit();
                }}
                disabled={loading}
                className={`items-center justify-center shrink-0 ${
                  isOpen
                    ? `rounded-full px-3.5 py-1.5 ${
                        canSubmit
                          ? "bg-brand"
                          : "bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700"
                      }`
                    : "w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700"
                }`}
              >
                {isOpen ? (
                  <Text
                    className={`text-xs font-bold ${
                      canSubmit
                        ? "text-white"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {loading ? t("common.loadingDots") : t("composer.publish")}
                  </Text>
                ) : (
                  <Ionicons name="add" size={18} color="#9CA3AF" />
                )}
              </Pressable>
            </View>
          </View>

          <TextInput
            ref={inputRef}
            value={location}
            onChangeText={(nextValue) => {
              setLocation(nextValue);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              openComposer();
              setActiveStep("location");
              setIsLocationFocused(true);
            }}
            onBlur={() => {
              setIsLocationFocused(false);
              if (activeStep === "location" && location.trim()) {
                setActiveStep(selectedDate === null ? "day" : getNextIncompleteStep({
                  location,
                  selectedDate,
                  selectedTime,
                  visibility,
                }));
              }
            }}
            onSubmitEditing={advanceAfterLocation}
            placeholder={t("composer.where")}
            placeholderTextColor="#9CA3AF"
            className={`mt-0.5 text-sm py-0 ${
              isOpen
                ? "text-gray-700 dark:text-gray-200"
                : "text-gray-500 dark:text-gray-400"
            }`}
            autoCorrect={false}
            maxLength={80}
            returnKeyType="next"
          />
        </View>
      </View>

      {isOpen ? (
        <View className="mt-3">
          {locationSuggestionsVisible ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              className="mb-3"
            >
              <View className="flex-row gap-2">
                {LOCATION_SUGGESTIONS.map((suggestion) => (
                  <Pressable
                    key={suggestion}
                    onPress={() => handleSuggestionPress(suggestion)}
                    className="bg-white dark:bg-neutral-800 rounded-full px-4 py-2 border border-gray-100 dark:border-neutral-700"
                  >
                    <Text className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {suggestion}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            className="mb-3"
          >
            <View className="flex-row gap-2">
              {selectedDate !== null ? (
                <SummaryChip
                  label={dayLabel ?? t("composer.day")}
                  active={activeStep === "day"}
                  onPress={() => setActiveStep("day")}
                />
              ) : null}
              {selectedTime ? (
                <SummaryChip
                  label={selectedTime}
                  active={activeStep === "time"}
                  onPress={() => setActiveStep("time")}
                />
              ) : null}
              {visibility ? (
                <SummaryChip
                  label={visibility === "public" ? t("common.public") : t("common.private")}
                  active={activeStep === "visibility"}
                  onPress={() => setActiveStep("visibility")}
                />
              ) : null}
              {visibility ? (
                <SummaryChip
                  label={note.trim() ? t("composer.descriptionAdded") : t("composer.addDescription")}
                  active={activeStep === "note"}
                  onPress={() =>
                    setActiveStep((current) => (current === "note" ? null : "note"))
                  }
                />
              ) : null}
            </View>
          </ScrollView>

          {visibility === "private" ? (
            <View className="mb-3 px-1">
              {loadingBuddies ? (
                <ActivityIndicator color="#00A6F6" />
              ) : (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {buddyMatchIds.length > 0
                    ? buddyMatchIds.length === 1
                      ? t("composer.privateOne")
                      : t("composer.privateMany", { count: buddyMatchIds.length })
                    : t("composer.privateNone")}
                </Text>
              )}
            </View>
          ) : null}

          {activeStep === "day" ? (
            <StepBlock title={t("composer.chooseDay")}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                <View className="flex-row gap-2">
                  {dayOptions.map((dayOption) => (
                    <Pressable
                      key={dayOption.offset}
                      onPress={() => handleSelectDay(dayOption.offset)}
                      className={`py-2.5 px-4 rounded-2xl items-center min-w-[72px] ${
                        selectedDate === dayOption.offset
                          ? "bg-brand"
                          : "bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700"
                      }`}
                    >
                      <Text
                        className={`font-semibold ${
                          selectedDate === dayOption.offset
                            ? "text-white"
                            : "text-gray-700 dark:text-gray-200"
                        }`}
                      >
                        {dayOption.label}
                      </Text>
                      <Text
                        className={`text-xs mt-0.5 ${
                          selectedDate === dayOption.offset
                            ? "text-blue-100"
                            : "text-gray-400 dark:text-gray-500"
                        }`}
                      >
                        {dayOption.sublabel}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </StepBlock>
          ) : null}

          {activeStep === "time" ? (
            <StepBlock title={t("composer.chooseTime")}>
              {availableTimes.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  <View className="flex-row gap-2">
                    {availableTimes.map((timeSlot: string) => (
                      <Pressable
                        key={timeSlot}
                        onPress={() => handleSelectTime(timeSlot)}
                        className={`px-4 py-2.5 rounded-xl ${
                          selectedTime === timeSlot
                            ? "bg-brand"
                            : "bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700"
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            selectedTime === timeSlot
                              ? "text-white"
                              : "text-gray-700 dark:text-gray-200"
                          }`}
                        >
                          {timeSlot}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              ) : (
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {t("composer.noTimes")}
                </Text>
              )}
            </StepBlock>
          ) : null}

          {activeStep === "visibility" ? (
            <StepBlock title={t("composer.chooseVisibility")}>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={() => handleSelectVisibility("public")}
                  className={`flex-1 py-3 rounded-2xl items-center ${
                    visibility === "public"
                      ? "bg-brand"
                      : "bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      visibility === "public"
                        ? "text-white"
                        : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {t("common.public")}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      visibility === "public"
                        ? "text-blue-100"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {t("composer.everyoneSees")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => handleSelectVisibility("private")}
                  className={`flex-1 py-3 rounded-2xl items-center ${
                    visibility === "private"
                      ? "bg-brand"
                      : "bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700"
                  }`}
                >
                  <Text
                    className={`font-semibold ${
                      visibility === "private"
                        ? "text-white"
                        : "text-gray-700 dark:text-gray-200"
                    }`}
                  >
                    {t("common.private")}
                  </Text>
                  <Text
                    className={`text-xs mt-0.5 ${
                      visibility === "private"
                        ? "text-blue-100"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {t("composer.onlyBuddies")}
                  </Text>
                </Pressable>
              </View>
            </StepBlock>
          ) : null}

          {activeStep === "note" ? (
            <StepBlock title={t("composer.addNoteOptional")}>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t("composer.notePlaceholder")}
                placeholderTextColor="#888"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="text-base text-gray-900 dark:text-white min-h-16 bg-white dark:bg-neutral-800 rounded-2xl px-4 py-3 border border-gray-100 dark:border-neutral-700"
              />
            </StepBlock>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function StepBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="pt-1">
      <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 px-1">
        {title}
      </Text>
      {children}
    </View>
  );
}

function SummaryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full px-3 py-1.5 ${
        active
          ? "bg-brand"
          : "bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-700"
      }`}
    >
      <Text
        className={`text-xs font-semibold ${
          active ? "text-white" : "text-gray-700 dark:text-gray-200"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function getNextIncompleteStep({
  location,
  selectedDate,
  selectedTime,
  visibility,
}: {
  location: string;
  selectedDate: number | null;
  selectedTime: string;
  visibility: "public" | "private" | null;
}): ComposerStep {
  if (!location.trim()) return "location";
  if (selectedDate === null) return "day";
  if (!selectedTime) return "time";
  if (visibility === null) return "visibility";
  return null;
}

function getScheduledDate(selectedDate: number, selectedTime: string) {
  const now = new Date();
  const date = new Date(now);
  date.setDate(date.getDate() + selectedDate);
  if (selectedTime) {
    const [hours, minutes] = selectedTime.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
  }
  return date;
}

function isTimeSlotPast(selectedDate: number, timeSlot: string) {
  if (selectedDate !== 0) return false;
  const [hours, minutes] = timeSlot.split(":").map(Number);
  const slot = new Date();
  slot.setHours(hours, minutes, 0, 0);
  return slot.getTime() <= Date.now();
}

function getBoneCreateErrorMessage(
  error: unknown,
  t: (key: TranslationKey, params?: Record<string, string | number>) => string
) {
  const rawMessage =
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error ?? "Neznana napaka");

  if (
    rawMessage.includes("Cannot invite a blocked buddy") ||
    rawMessage.includes("No eligible buddies")
  ) {
    return t("composer.blockedBuddies");
  }

  if (rawMessage.includes("Select at least one buddy")) {
    return t("composer.noEligibleBuddies");
  }

  return rawMessage;
}
