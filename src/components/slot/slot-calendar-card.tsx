import type { ReactNode, RefObject } from 'react';
import { Feather } from '@expo/vector-icons';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { DashboardSlotTimeline } from '@/src/features/dashboard/dashboard-slot-timeline';
import type { TimelineWindow } from '@/src/features/dashboard/dashboard-timeline-utils';
import type { CalendarSlotRecord } from '@/src/domain/types';
import { useTranslation } from '@/src/i18n/provider';
import { useAppTheme } from '@/src/theme/ui';

export function SlotCalendarCard(props: {
  mode: 'compact' | 'full';
  title?: string;
  publicSlug: string | null;
  missingLinkLabel?: string | null;
  copyFeedbackVisible: boolean;
  onCopyPublicLink: () => void;
  slots?: CalendarSlotRecord[];
  slotsLoading?: boolean;
  slotsError?: string | null;
  todaySlotCount?: number;
  timelineWindow?: TimelineWindow;
  slotTimelineRef?: RefObject<ScrollView | null>;
  onSlotTimelineScroll?: (x: number) => void;
  onTimelineViewportLayout?: (width: number) => void;
  settingsHref?: Href;
  overviewHref?: Href;
  expanded?: boolean;
  onToggleExpand?: () => void;
  actions?: ReactNode;
  headerAccessory?: ReactNode;
  timelineContent?: ReactNode;
  panelStyle?: StyleProp<ViewStyle>;
}) {
  const { theme, uiStyles } = useAppTheme();
  const { t } = useTranslation();
  const todayCount = props.todaySlotCount ?? 0;
  const title = props.title ?? t('calendar.title');
  const shouldRenderTimeline =
    props.mode === 'full' &&
    (Boolean(props.timelineContent) ||
      (props.timelineWindow &&
        props.slotTimelineRef &&
        typeof props.onSlotTimelineScroll === 'function'));
  const shouldRenderLinkRow =
    props.mode === 'full' && (Boolean(props.publicSlug) || Boolean(props.missingLinkLabel));
  const shouldRenderExpandedActions =
    props.mode === 'full' &&
    props.expanded &&
    (Boolean(props.settingsHref) || Boolean(props.actions));

  const timelineNode =
    props.timelineContent ?? (
      <DashboardSlotTimeline
        slots={props.slots ?? []}
        loading={props.slotsLoading ?? false}
        error={props.slotsError ?? null}
        window={props.timelineWindow!}
        scrollRef={props.slotTimelineRef!}
        onScroll={props.onSlotTimelineScroll!}
      />
    );

  const renderOverviewLink = () =>
    props.overviewHref ? (
      <Link href={props.overviewHref} asChild>
        <Pressable style={{ alignSelf: 'flex-start', marginTop: theme.spacing[12] }}>
          <Text style={uiStyles.linkText}>{t('calendar.openOverview')}</Text>
        </Pressable>
      </Link>
    ) : null;

  const renderExpandedActions = () => {
    if (!shouldRenderExpandedActions) {
      return null;
    }

    return (
      <View
        style={{
          marginTop: theme.spacing[12],
          paddingTop: theme.spacing[12],
          borderTopWidth: 1,
          borderColor: theme.colors.border,
          gap: theme.spacing[8],
        }}>
        {props.settingsHref ? (
          <Link href={props.settingsHref} asChild>
            <Pressable style={uiStyles.button}>
              <Text style={uiStyles.buttonText}>{t('calendar.settingsLink')}</Text>
            </Pressable>
          </Link>
        ) : null}
        {props.actions}
      </View>
    );
  };

  const renderLinkRow = () => {
    if (!shouldRenderLinkRow) {
      return null;
    }

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: theme.spacing[12],
          marginTop: theme.spacing[12],
        }}>
        <Text
          style={[
            uiStyles.secondaryText,
            {
              flex: 1,
              fontSize: 14,
            },
          ]}>
          {props.publicSlug
            ? t('calendar.linkLabel', { slug: props.publicSlug })
            : props.missingLinkLabel}
        </Text>
        {props.publicSlug ? (
          <Pressable
            onPress={() => props.onCopyPublicLink()}
            accessibilityRole="button"
            accessibilityLabel={t('calendar.copyLink')}>
            <Feather
              name={props.copyFeedbackVisible ? 'check' : 'copy'}
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        ) : null}
      </View>
    );
  };

  const renderTimelineSection = () =>
    shouldRenderTimeline ? (
      <View
        onLayout={(event) =>
          props.onTimelineViewportLayout?.(event.nativeEvent.layout.width)
        }>
        {timelineNode}
      </View>
    ) : null;

  return (
    <View style={[uiStyles.panel, props.panelStyle]}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: theme.spacing[12],
          marginBottom: props.mode === 'compact' ? theme.spacing[8] : theme.spacing[12],
        }}>
        {props.onToggleExpand ? (
          <Pressable
            onPress={props.onToggleExpand}
            style={{ flex: 1 }}
            accessibilityRole="button"
            accessibilityLabel={`${title} öffnen`}>
            <Text style={[uiStyles.sectionTitle, { marginBottom: 0 }]}>{title}</Text>
          </Pressable>
        ) : (
          <Text style={[uiStyles.sectionTitle, { flex: 1, marginBottom: 0 }]}>{title}</Text>
        )}
        {props.headerAccessory}
      </View>

      {props.mode === 'compact' ? (
        <>
          <Text style={[uiStyles.bodyText, { marginBottom: theme.spacing[4] }]}>
            {t(todayCount === 1 ? 'calendar.todayCount.one' : 'calendar.todayCount.other', {
              count: todayCount,
            })}
          </Text>
          {props.slotsError ? (
            <Text style={[uiStyles.secondaryText, { marginBottom: theme.spacing[8] }]}>
              {props.slotsError}
            </Text>
      ) : null}
          {renderOverviewLink()}
        </>
      ) : (
        <>
          {props.onToggleExpand ? (
            <Pressable
              onPress={props.onToggleExpand}
              accessibilityRole="button"
              accessibilityLabel={`${title} öffnen`}>
              {renderTimelineSection()}
            </Pressable>
          ) : (
            renderTimelineSection()
          )}
          {renderLinkRow()}
          {renderExpandedActions()}
          {renderOverviewLink()}
        </>
      )}
    </View>
  );
}
