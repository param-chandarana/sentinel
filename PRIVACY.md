# Privacy Policy for Sentinel

**Effective Date:** July 24, 2026

This Privacy Policy explains how the **Sentinel** Discord Bot ("the Bot") collects, stores, processes, and shares data when you add the Bot to your Discord server (Guild) or interact with it. 

As Sentinel is designed to be self-hosted, all references to "we," "us," or "our" in this policy refer to the **administrator/owner of the specific self-hosted instance** of the Bot that you are interacting with.

---

## 1. Information We Collect

To function properly as a server moderation and counting safety utility, Sentinel collects and processes certain information from Discord. This data is split into two categories: **Automatically Processed Data** and **Stored Data**.

### A. Data Stored in the Database
Sentinel stores the following data in its persistent database (PostgreSQL):
*   **Guild (Server) Configuration:** 
    *   Discord Guild IDs.
    *   Bot command prefix configurations.
    *   Channel IDs configured for logging (moderation logs, ban logs, join logs, leave logs) and counting games.
    *   Role IDs configured for muting (`muteRole`) and blacklist tracking (`countingBlacklistRole`).
    *   Time window limits for tracking counting saves.
*   **Infraction & Moderation Records:**
    *   **User IDs** of individuals who receive moderation actions (bans, kicks, mutes, warnings, timeouts, counting blacklists).
    *   **Moderator IDs** of the staff members who issue moderation actions.
    *   **Infraction Details:** Action type, case numbers, reasons provided by moderators, timestamps, duration of temporary punishments, and expiration times.
    *   **DM Queue Logs:** Message contents, recipient User IDs, and delivery statuses of Direct Messages sent to notified users.
*   **Invite & Joining Cache:**
    *   Discord invite codes, usage counts, and the User IDs of members who created those invite links. This is used to track and log who invited a rejoining user.

### B. Automatically Processed Data (Transient)
The Bot processes the following data dynamically through the Discord API Gateway, but does not store it in its database:
*   **Discord Usernames & Avatars:** Processed transiently to display user profiles in embed logs, command outputs, or moderation notifications.
*   **Message Content:** 
    *   Messages sent by specific third-party bots in the configured **counting channel** are analyzed transiently to detect counting save abuses and enforce game rules. The Bot instantly discards messages from other channels and does not log or store any message content to its database.
    *   The Bot relies on Discord's Slash Commands for general user interactions and does not process message content for standard commands.

---

## 2. How We Use Your Information

We use the collected information solely for the administration and security of the Discord servers in which the Bot is installed:
1.  **Moderation Enforcement:** To track active bans, mutes, and blacklists. This ensures that if a moderated user leaves and rejoins a server, their punishments (like mute or blacklist roles) are automatically reapplied.
2.  **Server Auditing & Logs:** To log moderation history, join/leave events, and invitation tracking to the channels designated by server administrators.
3.  **Counting Safeguards:** To automate the prevention of counting game save abuse by tracking and blacklisting offending users.
4.  **Notifications:** To queue and deliver Direct Messages informing users of infraction reasons, duration, and optional ban appeal links.

---

## 3. Data Storage and Security

*   **Self-Hosted Nature:** Because Sentinel is self-hosted, your data is stored in the database configured and controlled by the instance administrator (the host). It is not sent to the bot creator or any centralized Sentinel registry.
*   **Data Security:** The instance administrator is responsible for maintaining the physical and digital security of the hosting environment and database. 
*   **Data Retention:** 
    *   Infraction records are stored indefinitely to maintain historical context for moderators. Server administrators can soft-delete infractions, which hides them from general views but retains them in the database with a deletion timestamp.
    *   Invite cache data is updated dynamically as invites are created, used, or deleted.

---

## 4. Data Sharing and Third Parties

Sentinel does not sell, trade, or share your data with any third parties, except:
*   **Discord Inc.:** Data is transmitted via the Discord API Gateway to enable bot interactions, command responses, and logging actions.
*   **Hosting Providers:** Data is stored within the hosting infrastructure selected by the instance administrator.

---

## 5. User Rights (Access and Deletion)

Depending on your jurisdiction, you may have rights regarding your personal data:
*   **Access:** You can view your server-specific infraction history at any time using the bot's `infraction list` command (where enabled by server rules).
*   **Deletion (Right to be Forgotten):** If you wish to have your stored infraction history, user ID, or logs deleted from a specific Bot instance, you must contact the **Server Administrator** or the **Instance Owner** of the Bot. They can purge infraction records from the database or completely remove the Bot from the server, which stops further data processing.

---

## 6. Policy Updates

The instance administrator reserves the right to modify this Privacy Policy at any time. When changes are made, the effective date at the top of the policy will be updated. We recommend that users and server members review this document periodically.

---

## 7. Contact Information

For questions regarding this Privacy Policy, data access requests, or deletion inquiries, please contact the **Server Administrator / Bot Instance Host** of the Discord server you are using.
