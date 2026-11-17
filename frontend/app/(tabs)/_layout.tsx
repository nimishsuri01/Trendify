import { Ionicons } from "@expo/vector-icons";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { usesNativeTabs } from "@/src/navigation";
import { useTheme } from "@/src/theme";

const Trigger: any = (NativeTabs as any)?.Trigger;
const TriggerIcon: any = Trigger?.Icon;
const TriggerLabel: any = Trigger?.Label;

export default function TabLayout() {
    const { colors } = useTheme();
    if (usesNativeTabs && NativeTabs && Trigger) {
        return (
            <NativeTabs>
                <Trigger name="index"><TriggerIcon sf="house.fill" /><TriggerLabel>Home</TriggerLabel></Trigger>
                <Trigger name="explore"><TriggerIcon sf="sparkles" /><TriggerLabel>Explore</TriggerLabel></Trigger>
                <Trigger name="cart"><TriggerIcon sf="bag.fill" /><TriggerLabel>Bag</TriggerLabel></Trigger>
                <Trigger name="account"><TriggerIcon sf="person.fill" /><TriggerLabel>Account</TriggerLabel></Trigger>
            </NativeTabs>
        );
    }
    return (
        <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.onSurface, tabBarInactiveTintColor: colors.muted, tabBarStyle: { ...(Platform.OS === "web" ? { height: 64 } : {}), backgroundColor: colors.surfaceSecondary, borderTopColor: colors.border }, tabBarItemStyle: { alignSelf: "center" } }}>
            <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="home-outline" color={typeof color === "string" ? color : colors.muted} size={size} /> }} />
            <Tabs.Screen name="explore" options={{ title: "Explore", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="sparkles-outline" color={typeof color === "string" ? color : colors.muted} size={size} /> }} />
            <Tabs.Screen name="cart" options={{ title: "Bag", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="bag-handle-outline" color={typeof color === "string" ? color : colors.muted} size={size} /> }} />
            <Tabs.Screen name="account" options={{ title: "Account", tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="person-outline" color={typeof color === "string" ? color : colors.muted} size={size} /> }} />
        </Tabs>
    );
}
