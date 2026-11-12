/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { playAudio } from "@api/AudioPlayer";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Flex } from "@components/Flex";
import { Paragraph } from "@components/Paragraph";
import definePlugin, { OptionType } from "@utils/types";
import type { User, VoiceState } from "@vencord/discord-types";
import { Avatar, ChannelRouter, ChannelStore, GuildStore, IconUtils, Menu, showToast, TextInput, UserStore, UserUtils, useState, useStateFromStores } from "@webpack/common";

interface TrackedUser {
    id: string;
    username: string;
}

const LIST_KEYS: "trackedUsers"[] = ["trackedUsers"];

const settings = definePluginSettings({
    notifyOnMove: {
        type: OptionType.BOOLEAN,
        description: "Also notify when a tracked user switches from one voice channel to another.",
        default: true
    },
    playSound: {
        type: OptionType.BOOLEAN,
        description: "Play the ping sound together with the notification.",
        default: true
    },
    trackedUsers: {
        type: OptionType.CUSTOM,
        description: "Users you get voice notifications for.",
        default: [] as TrackedUser[]
    },
    userList: {
        type: OptionType.COMPONENT,
        component: UserListSetting
    }
});

const isTracked = (id: string) => settings.store.trackedUsers.some(u => u.id === id);

function addUser({ id, username }: User) {
    settings.store.trackedUsers = [...settings.store.trackedUsers, { id, username }];
}

function removeUser(id: string) {
    settings.store.trackedUsers = settings.store.trackedUsers.filter(u => u.id !== id);
}

function UserRow({ id, username }: TrackedUser) {
    const user = useStateFromStores<User | undefined>([UserStore], () => UserStore.getUser(id));

    return (
        <Flex alignItems="center" gap="12px">
            <Avatar src={user ? user.getAvatarURL(undefined, 64) : IconUtils.getDefaultAvatarURL(id)} size="SIZE_32" />
            <div style={{ flex: 1 }}>
                <Paragraph weight="semibold" selectable>{user?.username ?? username}</Paragraph>
                <Paragraph size="xs" color="text-muted" selectable>{id}</Paragraph>
            </div>
            <Button variant="dangerSecondary" size="small" onClick={() => removeUser(id)}>Remove</Button>
        </Flex>
    );
}

function UserListSetting() {
    const { trackedUsers } = settings.use(LIST_KEYS);
    const [input, setInput] = useState("");

    async function onAdd() {
        const id = input.trim();
        if (!/^\d{17,20}$/.test(id)) return showToast({ text: "That doesn't look like a valid user ID.", variant: "critical" });
        if (isTracked(id)) return showToast({ text: "That user is already in the list.", variant: "critical" });

        try {
            const user: User = UserStore.getUser(id) ?? await UserUtils.getUser(id);
            addUser(user);
            setInput("");
        } catch {
            showToast({ text: "Couldn't find a user with that ID.", variant: "critical" });
        }
    }

    return (
        <Flex flexDirection="column" gap="12px">
            <Paragraph size="md" weight="semibold">Tracked users</Paragraph>
            <Flex gap="8px">
                <div style={{ flex: 1 }}>
                    <TextInput placeholder="User ID" value={input} onChange={setInput} />
                </div>
                <Button size="small" onClick={onAdd}>Add</Button>
            </Flex>
            {trackedUsers.length
                ? trackedUsers.map(u => <UserRow key={u.id} {...u} />)
                : <Paragraph color="text-muted">No users yet. Right click someone and pick Add Voice Ping, or paste their ID above.</Paragraph>}
        </Flex>
    );
}

const UserContextMenuPatch: NavContextMenuPatchCallback = (children, { user }: { user?: User; }) => {
    if (!user || user.id === UserStore.getCurrentUser().id) return;
    const tracked = isTracked(user.id);

    children.push(
        <Menu.MenuGroup>
            <Menu.MenuItem
                id="vc-voice-notifier-toggle"
                label={tracked ? "Remove Voice Ping" : "Add Voice Ping"}
                action={() => {
                    if (tracked) removeUser(user.id);
                    else addUser(user);
                    showToast({ text: tracked ? `${user.username} removed from Voice Ping.` : `${user.username} added to Voice Ping.`, variant: "success" });
                }}
            />
        </Menu.MenuGroup>
    );
};

function notify(userId: string, channelId: string, guildId?: string) {
    const user = UserStore.getUser(userId);
    const channel = ChannelStore.getChannel(channelId);
    const guild = guildId ? GuildStore.getGuild(guildId) : null;

    showNotification({
        title: `${user.globalName ?? user.username} joined a voice channel`,
        body: guild ? `${channel.name} in ${guild.name}` : "In a private call",
        icon: user.getAvatarURL(guildId, 128),
        onClick: () => ChannelRouter.transitionToChannel(channelId)
    });

    if (settings.store.playSound) playAudio("message1");
}

export default definePlugin({
    name: "VoiceNotifier",
    description: "Notifies you when specific users join a voice channel in any server you share with them.",
    authors: [{ name: "centoventotto", id: 838808975558311948n }],
    tags: ["Voice", "Notifications"],
    settings,
    dependencies: ["AudioPlayerAPI"],
    contextMenus: {
        "user-context": UserContextMenuPatch
    },
    flux: {
        VOICE_STATE_UPDATES({ voiceStates }: { voiceStates: VoiceState[]; }) {
            const { trackedUsers, notifyOnMove } = settings.plain;
            if (!trackedUsers.length) return;

            for (const { userId, channelId, oldChannelId, guildId } of voiceStates) {
                if (!channelId || channelId === oldChannelId || (oldChannelId && !notifyOnMove)) continue;
                if (trackedUsers.some(u => u.id === userId)) notify(userId, channelId, guildId);
            }
        }
    }
});
