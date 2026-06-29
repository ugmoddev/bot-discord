const { Client, GatewayIntentBits, Events, EmbedBuilder, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// ========== CẤU HÌNH ==========
const TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const ADMIN_ID = process.env.ADMIN_ID || '1316027180433801296';

// Kiểm tra biến môi trường
if (!TOKEN) {
    console.error('❌ Lỗi: BOT_TOKEN không được tìm thấy trong .env');
    process.exit(1);
}

if (!CLIENT_ID) {
    console.error('❌ Lỗi: CLIENT_ID không được tìm thấy trong .env');
    process.exit(1);
}

// Database tạm (lưu trong RAM)
const games = {
    economy: new Map(),
    gambling: new Map(),
    trivia: new Map(),
    tictactoe: new Map(),
    counting: new Map(),
    blackjack: new Map(),
    guessing: new Map()
};

// Dữ liệu câu hỏi đố vui
const triviaQuestions = [
    {
        question: 'Trò chơi nào được phát hành đầu tiên?',
        options: ['Minecraft', 'Roblox', 'Fortnite', 'Among Us'],
        answer: 0
    },
    {
        question: 'Ai là nhân vật chính trong game "The Legend of Zelda"?',
        options: ['Zelda', 'Link', 'Ganon', 'Epona'],
        answer: 1
    },
    {
        question: 'Game nào có số lượng người chơi nhiều nhất thế giới?',
        options: ['Minecraft', 'PUBG', 'Fortnite', 'League of Legends'],
        answer: 0
    },
    {
        question: 'Công ty nào phát hành game "Grand Theft Auto V"?',
        options: ['EA', 'Ubisoft', 'Rockstar Games', 'Activision'],
        answer: 2
    },
    {
        question: 'Pokémon xuất hiện lần đầu vào năm nào?',
        options: ['1990', '1996', '2000', '2005'],
        answer: 1
    }
];

// Hàm random
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Hàm kiểm tra admin
function isAdmin(userId) {
    return userId === ADMIN_ID;
}

// Hàm lấy số dư
function getBalance(userId) {
    if (isAdmin(userId)) {
        return Infinity;
    }
    const data = games.economy.get(userId);
    return data ? data.money : 0;
}

// Hàm cập nhật tiền
function updateMoney(userId, amount) {
    if (isAdmin(userId)) {
        return true;
    }
    
    const data = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
    const newBalance = data.money + amount;
    
    if (newBalance < 0) {
        return false;
    }
    
    data.money = newBalance;
    games.economy.set(userId, data);
    return true;
}

// Hàm tạo Embed
function createEmbed(title, description, color = '#00ff00') {
    return new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(color)
        .setTimestamp()
        .setFooter({ text: 'Game Bot 🎮' });
}

// Helper function hiển thị bảng cờ caro
function displayBoard(board) {
    let display = '';
    for (let i = 0; i < 9; i += 3) {
        display += `${board[i] || i+1} | ${board[i+1] || i+2} | ${board[i+2] || i+3}\n`;
        if (i < 6) display += '---------';
        if (i < 6) display += '\n';
    }
    return '```\n' + display + '\n```';
}

// ========== ĐỊNH NGHĨA SLASH COMMANDS ==========
const commands = [
    // Game chính
    new SlashCommandBuilder()
        .setName('game')
        .setDescription('🎮 Xem danh sách tất cả game'),
    
    // Đoán số
    new SlashCommandBuilder()
        .setName('guess')
        .setDescription('🎯 Bắt đầu game đoán số (1-100)')
        .addIntegerOption(option =>
            option.setName('number')
                .setDescription('Số bạn đoán (1-100)')
                .setMinValue(1)
                .setMaxValue(100)),
    
    // Oẳn tù tì
    new SlashCommandBuilder()
        .setName('rps')
        .setDescription('✊ Oẳn tù tì với bot')
        .addStringOption(option =>
            option.setName('choice')
                .setDescription('Lựa chọn của bạn')
                .setRequired(true)
                .addChoices(
                    { name: '✊ Búa', value: 'búa' },
                    { name: '✋ Bao', value: 'bao' },
                    { name: '✂️ Kéo', value: 'kéo' }
                )),
    
    // Tung xúc xắc
    new SlashCommandBuilder()
        .setName('dice')
        .setDescription('🎲 Tung xúc xắc'),
    
    // Tung đồng xu
    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('🪙 Tung đồng xu'),
    
    // Đố vui
    new SlashCommandBuilder()
        .setName('trivia')
        .setDescription('❓ Đố vui về game')
        .addIntegerOption(option =>
            option.setName('answer')
                .setDescription('Đáp án (1-4)')
                .setMinValue(1)
                .setMaxValue(4)),
    
    // Cờ caro
    new SlashCommandBuilder()
        .setName('tictactoe')
        .setDescription('❌ Chơi cờ caro với bạn bè')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Chọn đối thủ')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('position')
                .setDescription('Vị trí đánh (1-9)')
                .setMinValue(1)
                .setMaxValue(9)),
    
    // Đếm số
    new SlashCommandBuilder()
        .setName('number')
        .setDescription('🔢 Đếm số cộng đồng')
        .addIntegerOption(option =>
            option.setName('num')
                .setDescription('Số tiếp theo')
                .setMinValue(1)),
    
    // Máy đánh bạc
    new SlashCommandBuilder()
        .setName('slot')
        .setDescription('🎰 Quay máy đánh bạc')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số tiền cược')
                .setMinValue(1)),
    
    // Kinh tế
    new SlashCommandBuilder()
        .setName('balance')
        .setDescription('💰 Xem số dư của bạn'),
    
    new SlashCommandBuilder()
        .setName('daily')
        .setDescription('🎁 Nhận tiền hàng ngày'),
    
    new SlashCommandBuilder()
        .setName('work')
        .setDescription('💼 Làm việc kiếm tiền'),
    
    new SlashCommandBuilder()
        .setName('gamble')
        .setDescription('🎲 Đánh bạc')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số tiền cược')
                .setRequired(true)
                .setMinValue(10)),
    
    // Thống kê
    new SlashCommandBuilder()
        .setName('stats')
        .setDescription('📊 Xem thống kê game của bạn'),
    
    new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('🏆 Bảng xếp hạng giàu nhất'),
    
    // Admin commands
    new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('💰 Thêm tiền cho người dùng (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Số tiền')
                .setRequired(true)
                .setMinValue(1)),
    
    new SlashCommandBuilder()
        .setName('resetmoney')
        .setDescription('🔄 Reset tiền của người dùng (Admin only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('Người dùng')
                .setRequired(true)),
    
    new SlashCommandBuilder()
        .setName('allusers')
        .setDescription('📊 Xem danh sách tất cả người chơi (Admin only)')
];

// ========== DEPLOY COMMANDS ==========
async function deployCommands() {
    try {
        const rest = new REST({ version: '10' }).setToken(TOKEN);
        
        console.log('🔄 Đang deploy slash commands...');
        
        // Deploy global commands
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands.map(cmd => cmd.toJSON()) }
        );
        
        console.log('✅ Deploy global commands thành công!');
        console.log('⏳ Lưu ý: Slash commands có thể mất đến 1 giờ để cập nhật trên toàn cầu.');
    } catch (error) {
        console.error('❌ Lỗi deploy commands:', error);
    }
}

// ========== XỬ LÝ SLASH COMMANDS ==========
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    
    const { commandName, user, options } = interaction;
    const userId = user.id;
    const isAdminUser = isAdmin(userId);
    
    // ========== GAME MENU ==========
    if (commandName === 'game') {
        const adminBadge = isAdminUser ? ' 👑' : '';
        const embed = createEmbed(
            '🎮 MENU GAME',
            `Chào ${user.username}${adminBadge}! Đây là danh sách game bạn có thể chơi:
            
**🎯 Mini Games:**
\`/guess [số]\` - Đoán số (1-100)
\`/trivia [đáp án]\` - Đố vui game
\`/tictactoe [@đối_thủ] [vị trí]\` - Cờ caro với bạn bè
\`/rps [lựa chọn]\` - Oẳn tù tì
\`/dice\` - Tung xúc xắc
\`/coinflip\` - Tung đồng xu

**💰 Kinh tế:**
\`/balance\` - Xem số tiền
\`/daily\` - Nhận tiền hàng ngày
\`/work\` - Làm việc kiếm tiền
\`/gamble [số tiền]\` - Đánh bạc

**🎲 Game khác:**
\`/slot [số tiền]\` - Máy đánh bạc
\`/number [số]\` - Đếm số cộng đồng

**📊 Thống kê:**
\`/stats\` - Xem thống kê game
\`/leaderboard\` - Bảng xếp hạng`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    // ========== ĐOÁN SỐ ==========
    if (commandName === 'guess') {
        const guessNumber = options.getInteger('number');
        
        if (!guessNumber) {
            // Bắt đầu game mới
            const secretNumber = randomInt(1, 100);
            games.guessing.set(userId, {
                number: secretNumber,
                attempts: 0,
                maxAttempts: 7,
                guesses: []
            });
            
            const embed = createEmbed(
                '🎯 Đoán số',
                `Tôi đã chọn một số từ 1-100!\nBạn có 7 lần đoán.\nDùng \`/guess [số]\` để đoán.`
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        const game = games.guessing.get(userId);
        if (!game) {
            return interaction.reply('❌ Bạn chưa bắt đầu game! Dùng `/guess` để bắt đầu.');
        }
        
        game.attempts++;
        game.guesses.push(guessNumber);
        
        let result = '';
        let color = '#00ff00';
        
        if (guessNumber === game.number) {
            result = `🎉 **CHÍNH XÁC!** Bạn đã đoán đúng số ${game.number} sau ${game.attempts} lần!`;
            if (!isAdminUser) {
                const reward = randomInt(50, 200);
                const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
                userData.money += reward;
                userData.gamesPlayed++;
                userData.wins++;
                games.economy.set(userId, userData);
                result += `\n💰 Bạn nhận được **${reward} coins**!`;
            } else {
                result += `\n👑 Admin!`;
            }
            games.guessing.delete(userId);
        } else if (game.attempts >= game.maxAttempts) {
            result = `😔 Hết lượt! Số đúng là **${game.number}**.`;
            games.guessing.delete(userId);
            color = '#ff0000';
        } else {
            const hint = guessNumber < game.number ? '📈 Cao hơn!' : '📉 Thấp hơn!';
            result = `${hint} (${game.attempts}/${game.maxAttempts})\nCác số đã đoán: ${game.guesses.join(', ')}`;
            color = '#ffff00';
        }
        
        const embed = createEmbed('🎯 Đoán số', result, color);
        return interaction.reply({ embeds: [embed] });
    }
    
    // ========== OẲN TÙ TÌ ==========
    if (commandName === 'rps') {
        const choices = ['kéo', 'búa', 'bao'];
        const emojis = { kéo: '✂️', búa: '✊', bao: '✋' };
        
        const userChoice = options.getString('choice');
        const botChoice = choices[randomInt(0, 2)];
        
        let result = '';
        if (userChoice === botChoice) {
            result = '🤝 Hòa!';
        } else if (
            (userChoice === 'kéo' && botChoice === 'bao') ||
            (userChoice === 'búa' && botChoice === 'kéo') ||
            (userChoice === 'bao' && botChoice === 'búa')
        ) {
            result = '🎉 Bạn thắng!';
            if (!isAdminUser) {
                const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
                userData.money += 30;
                userData.gamesPlayed++;
                userData.wins++;
                games.economy.set(userId, userData);
                result += ' (+30 coins)';
            } else {
                result += ' 👑 Admin!';
            }
        } else {
            result = '😔 Bạn thua!';
        }
        
        const embed = createEmbed(
            '✊ Oẳn tù tì',
            `Bạn: ${emojis[userChoice]} ${userChoice}\nBot: ${emojis[botChoice]} ${botChoice}\n\n**${result}**`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    // ========== TUNG XÚC XẮC ==========
    if (commandName === 'dice') {
        const dice1 = randomInt(1, 6);
        const dice2 = randomInt(1, 6);
        const total = dice1 + dice2;
        
        const embed = createEmbed(
            '🎲 Tung xúc xắc',
            `🎲 Kết quả:\nXúc xắc 1: **${dice1}**\nXúc xắc 2: **${dice2}**\nTổng: **${total}**`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    // ========== TUNG ĐỒNG XU ==========
    if (commandName === 'coinflip') {
        const result = Math.random() < 0.5 ? 'Mặt ngửa (Heads)' : 'Mặt sấp (Tails)';
        const emoji = result.includes('ngửa') ? '🪙' : '🪙';
        
        const embed = createEmbed('🪙 Tung đồng xu', `${emoji} Kết quả: **${result}**`);
        return interaction.reply({ embeds: [embed] });
    }
    
    // ========== ĐỐ VUI ==========
    if (commandName === 'trivia') {
        const answer = options.getInteger('answer');
        
        if (!answer) {
            // Bắt đầu câu hỏi mới
            const question = triviaQuestions[randomInt(0, triviaQuestions.length - 1)];
            const optionsText = question.options.map((opt, i) => `${i + 1}. ${opt}`).join('\n');
            
            games.trivia.set(userId, question);
            
            const embed = createEmbed(
                '❓ Đố vui game',
                `**${question.question}**\n\n${optionsText}\n\nTrả lời bằng \`/trivia answer: [số]\``
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        const question = games.trivia.get(userId);
        if (!question) {
            return interaction.reply('❌ Bạn chưa bắt đầu câu hỏi nào! Dùng `/trivia` để bắt đầu.');
        }
        
        const choice = answer - 1;
        if (choice === question.answer) {
            const reward = randomInt(20, 80);
            if (!isAdminUser) {
                const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
                userData.money += reward;
                userData.gamesPlayed++;
                userData.wins++;
                games.economy.set(userId, userData);
                await interaction.reply(`🎉 Đúng rồi! Bạn nhận được **${reward} coins**!`);
            } else {
                await interaction.reply(`🎉 Đúng rồi! 👑 Admin!`);
            }
        } else {
            await interaction.reply(`❌ Sai rồi! Đáp án đúng là: **${question.options[question.answer]}**`);
        }
        
        games.trivia.delete(userId);
    }
    
    // ========== CỜ CARO ==========
    if (commandName === 'tictactoe') {
        const opponent = options.getUser('opponent');
        const position = options.getInteger('position');
        
        if (!position) {
            // Bắt đầu game mới
            if (!opponent) {
                return interaction.reply('⚠️ Vui lòng chọn đối thủ!');
            }
            if (opponent.bot) {
                return interaction.reply('❌ Không thể chơi với bot!');
            }
            if (opponent.id === userId) {
                return interaction.reply('❌ Không thể chơi với chính mình!');
            }
            
            const board = Array(9).fill(' ');
            const gameId = `${userId}_${opponent.id}`;
            games.tictactoe.set(gameId, {
                board: board,
                currentPlayer: userId,
                players: [userId, opponent.id],
                moves: 0
            });
            
            const embed = createEmbed(
                '❌ Bắt đầu game Cờ Caro ⭕',
                `**${user.username}** vs **${opponent.username}**\n\n${displayBoard(board)}\n\nLượt của: ${user.username} (❌)\nDùng \`/tictactoe position:[số]\` để đánh`
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        // Xử lý nước đi
        const pos = position - 1;
        let currentGame = null;
        let gameId = null;
        
        for (const [id, game] of games.tictactoe) {
            if (game.players.includes(userId) && game.currentPlayer === userId) {
                currentGame = game;
                gameId = id;
                break;
            }
        }
        
        if (!currentGame) {
            return interaction.reply('❌ Không có game cờ caro nào cho bạn hoặc không phải lượt của bạn!');
        }
        
        if (currentGame.board[pos] !== ' ') {
            return interaction.reply('❌ Ô này đã được đánh!');
        }
        
        const symbol = currentGame.currentPlayer === userId ? '❌' : '⭕';
        currentGame.board[pos] = symbol;
        currentGame.moves++;
        
        // Kiểm tra thắng
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        
        let winner = null;
        for (const pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (currentGame.board[a] !== ' ' &&
                currentGame.board[a] === currentGame.board[b] &&
                currentGame.board[b] === currentGame.board[c]) {
                winner = currentGame.board[a] === '❌' ? currentGame.players[0] : currentGame.players[1];
                break;
            }
        }
        
        if (winner) {
            const winnerUser = await client.users.fetch(winner);
            
            if (!isAdmin(winner)) {
                const reward = randomInt(50, 150);
                const userData = games.economy.get(winner) || { money: 0, gamesPlayed: 0, wins: 0 };
                userData.money += reward;
                userData.gamesPlayed++;
                userData.wins++;
                games.economy.set(winner, userData);
                
                const embed = createEmbed(
                    '🎉 Kết thúc game!',
                    `${displayBoard(currentGame.board)}\n\n**${winnerUser.username}** thắng! Nhận được **${reward} coins**!`
                );
                await interaction.reply({ embeds: [embed] });
            } else {
                const embed = createEmbed(
                    '🎉 Kết thúc game!',
                    `${displayBoard(currentGame.board)}\n\n**${winnerUser.username}** thắng! 👑 Admin!`
                );
                await interaction.reply({ embeds: [embed] });
            }
            
            games.tictactoe.delete(gameId);
            return;
        }
        
        // Hòa
        if (currentGame.moves === 9) {
            const embed = createEmbed(
                '🤝 Hòa!',
                `${displayBoard(currentGame.board)}\n\nKhông có ai thắng!`
            );
            await interaction.reply({ embeds: [embed] });
            games.tictactoe.delete(gameId);
            return;
        }
        
        // Đổi lượt
        currentGame.currentPlayer = currentGame.players.find(p => p !== userId);
        const nextPlayer = await client.users.fetch(currentGame.currentPlayer);
        
        const embed = createEmbed(
            '❌ Cờ Caro ⭕',
            `${displayBoard(currentGame.board)}\n\nLượt của: ${nextPlayer.username} (${currentGame.currentPlayer === currentGame.players[0] ? '❌' : '⭕'})\nDùng \`/tictactoe position:[số]\` để đánh`
        );
        await interaction.reply({ embeds: [embed] });
    }
    
    // ========== ĐẾM SỐ ==========
    if (commandName === 'number') {
        const num = options.getInteger('num');
        
        if (!num) {
            const currentNumber = games.counting.get('count') || 0;
            const nextNumber = currentNumber + 1;
            
            const embed = createEmbed(
                '🔢 Đếm số cộng đồng',
                `Số tiếp theo: **${nextNumber}**\nDùng \`/number num:[${nextNumber}]\` để tiếp tục!`
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        const expected = (games.counting.get('count') || 0) + 1;
        
        if (num === expected) {
            games.counting.set('count', num);
            const embed = createEmbed(
                '🔢 Đếm số',
                `✅ **${num}** - Lần tiếp theo: ${num + 1}`,
                '#00ff00'
            );
            await interaction.reply({ embeds: [embed] });
        } else if (num > expected) {
            games.counting.set('count', 0);
            const embed = createEmbed(
                '🔢 Đếm số',
                `❌ Sai số! Đếm lại từ 1.\nSố đúng là: **${expected}**`,
                '#ff0000'
            );
            await interaction.reply({ embeds: [embed] });
        }
    }
    
    // ========== MÁY ĐÁNH BẠC ==========
    if (commandName === 'slot') {
        const amount = options.getInteger('amount') || 10;
        
        if (isAdminUser) {
            const emojis = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣'];
            const slots = [
                emojis[randomInt(0, emojis.length - 1)],
                emojis[randomInt(0, emojis.length - 1)],
                emojis[randomInt(0, emojis.length - 1)]
            ];
            
            if (slots[0] === slots[1] && slots[1] === slots[2]) {
                const embed = createEmbed(
                    '🎰 JACKPOT! 🎰',
                    `🎉 **TRÚNG JACKPOT!**\n${slots.join(' | ')}\n👑 Admin!`,
                    '#ffd700'
                );
                return interaction.reply({ embeds: [embed] });
            }
            
            const embed = createEmbed(
                '🎰 Máy đánh bạc (Admin)',
                `${slots.join(' | ')}\n👑 Admin!`
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
        
        if (userData.money < amount) {
            return interaction.reply(`❌ Bạn không đủ tiền! Bạn có ${userData.money} coins.`);
        }
        
        const emojis = ['🍒', '🍋', '🍊', '🍇', '💎', '⭐', '7️⃣'];
        const slots = [
            emojis[randomInt(0, emojis.length - 1)],
            emojis[randomInt(0, emojis.length - 1)],
            emojis[randomInt(0, emojis.length - 1)]
        ];
        
        let winAmount = 0;
        if (slots[0] === slots[1] && slots[1] === slots[2]) {
            winAmount = amount * 10;
            const embed = createEmbed(
                '🎰 JACKPOT! 🎰',
                `🎉 **TRÚNG JACKPOT!**\n${slots.join(' | ')}\n💰 Bạn thắng **${winAmount} coins**!`,
                '#ffd700'
            );
            userData.money += winAmount;
            userData.wins++;
            games.economy.set(userId, userData);
            return interaction.reply({ embeds: [embed] });
        } else if (slots[0] === slots[1] || slots[1] === slots[2] || slots[0] === slots[2]) {
            winAmount = amount * 2;
            const embed = createEmbed(
                '🎰 Máy đánh bạc',
                `${slots.join(' | ')}\n🎉 Bạn thắng **${winAmount} coins**!`,
                '#00ff00'
            );
            userData.money += winAmount;
            userData.wins++;
            games.economy.set(userId, userData);
            return interaction.reply({ embeds: [embed] });
        } else {
            userData.money -= amount;
            games.economy.set(userId, userData);
            const embed = createEmbed(
                '🎰 Máy đánh bạc',
                `${slots.join(' | ')}\n😔 Bạn thua **${amount} coins**!`,
                '#ff0000'
            );
            return interaction.reply({ embeds: [embed] });
        }
    }
    
    // ========== KINH TẾ ==========
    if (commandName === 'balance') {
        const balance = getBalance(userId);
        if (isAdminUser) {
            const embed = createEmbed(
                '💰 Số dư của bạn',
                `**Số dư:** ♾️ VÔ HẠN (Admin)\n👑 Bạn có toàn quyền!`
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
        const embed = createEmbed(
            '💰 Số dư của bạn',
            `**Số dư:** ${userData.money} coins\n**Số game đã chơi:** ${userData.gamesPlayed}\n**Số lần thắng:** ${userData.wins}`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'daily') {
        if (isAdminUser) {
            return interaction.reply('👑 Admin không cần nhận daily! Bạn đã có vô hạn tiền.');
        }
        
        const lastDaily = games.economy.get(`daily_${userId}`) || 0;
        const now = Date.now();
        
        if (now - lastDaily < 86400000) {
            const remaining = Math.ceil((86400000 - (now - lastDaily)) / 3600000);
            return interaction.reply(`⏳ Bạn đã nhận daily rồi! Còn ${remaining} giờ nữa.`);
        }
        
        const amount = randomInt(100, 300);
        const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
        userData.money += amount;
        games.economy.set(userId, userData);
        games.economy.set(`daily_${userId}`, now);
        
        const embed = createEmbed(
            '🎁 Daily Reward',
            `Bạn đã nhận được **${amount} coins**!\nTổng số dư: **${userData.money} coins**`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'work') {
        if (isAdminUser) {
            return interaction.reply('👑 Admin không cần làm việc! Bạn có vô hạn tiền.');
        }
        
        const lastWork = games.economy.get(`work_${userId}`) || 0;
        const now = Date.now();
        
        if (now - lastWork < 300000) {
            const remaining = Math.ceil((300000 - (now - lastWork)) / 60000);
            return interaction.reply(`⏳ Nghỉ ngơi chút đi! Còn ${remaining} phút nữa.`);
        }
        
        const jobs = ['Lập trình viên', 'Streamer', 'Game thủ chuyên nghiệp', 'Nhà thiết kế', 'YouTuber'];
        const job = jobs[randomInt(0, jobs.length - 1)];
        const amount = randomInt(20, 100);
        
        const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
        userData.money += amount;
        games.economy.set(userId, userData);
        games.economy.set(`work_${userId}`, now);
        
        const embed = createEmbed(
            '💼 Làm việc',
            `Bạn làm **${job}** và kiếm được **${amount} coins**!\nTổng số dư: **${userData.money} coins**`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'gamble') {
        const amount = options.getInteger('amount');
        
        if (isAdminUser) {
            const dice = randomInt(1, 6);
            const win = dice > 3;
            const embed = createEmbed(
                '🎲 Đánh bạc (Admin)',
                `🎲 Bạn tung được **${dice}**\n${win ? '🎉 BẠN THẮNG! 👑 Admin' : '😔 BẠN THUA! 👑 Admin không mất tiền'}`,
                win ? '#00ff00' : '#ff0000'
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
        if (userData.money < amount) {
            return interaction.reply(`❌ Bạn không đủ tiền! Bạn có ${userData.money} coins.`);
        }
        
        const dice = randomInt(1, 6);
        const win = dice > 3;
        
        if (win) {
            const winnings = amount * 2;
            userData.money += winnings;
            userData.wins++;
            games.economy.set(userId, userData);
            
            const embed = createEmbed(
                '🎲 Đánh bạc',
                `🎲 Bạn tung được **${dice}**\n🎉 **BẠN THẮNG!** Nhận được **${winnings} coins**!\n💰 Số dư: ${userData.money} coins`,
                '#00ff00'
            );
            return interaction.reply({ embeds: [embed] });
        } else {
            userData.money -= amount;
            games.economy.set(userId, userData);
            
            const embed = createEmbed(
                '🎲 Đánh bạc',
                `🎲 Bạn tung được **${dice}**\n😔 **BẠN THUA!** Mất **${amount} coins**!\n💰 Số dư: ${userData.money} coins`,
                '#ff0000'
            );
            return interaction.reply({ embeds: [embed] });
        }
    }
    
    // ========== THỐNG KÊ ==========
    if (commandName === 'stats') {
        if (isAdminUser) {
            const embed = createEmbed(
                '📊 Thống kê của Admin',
                `👑 Bạn là Admin!\n**Số dư:** ♾️ Vô hạn\n**Quyền:** Toàn quyền quản lý bot`
            );
            return interaction.reply({ embeds: [embed] });
        }
        
        const userData = games.economy.get(userId) || { money: 0, gamesPlayed: 0, wins: 0 };
        const winRate = userData.gamesPlayed > 0 
            ? Math.round((userData.wins / userData.gamesPlayed) * 100) 
            : 0;
        
        const embed = createEmbed(
            '📊 Thống kê game của bạn',
            `**💰 Tiền:** ${userData.money} coins\n**🎮 Số game đã chơi:** ${userData.gamesPlayed}\n**🏆 Số lần thắng:** ${userData.wins}\n**📈 Tỷ lệ thắng:** ${winRate}%`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'leaderboard') {
        const sorted = Array.from(games.economy.entries())
            .filter(([id]) => !id.startsWith('daily_') && !id.startsWith('work_'))
            .sort((a, b) => b[1].money - a[1].money)
            .slice(0, 10);
        
        let leaderboard = '🏆 **Bảng xếp hạng giàu nhất** 🏆\n\n';
        leaderboard += `👑 **Admin** - ♾️ Vô hạn coins\n`;
        leaderboard += `━━━━━━━━━━━━━━━━━━━━━\n`;
        
        if (sorted.length === 0) {
            leaderboard += '📊 Chưa có người chơi nào!';
        } else {
            for (let i = 0; i < sorted.length; i++) {
                const [id, data] = sorted[i];
                if (id === ADMIN_ID) continue;
                const member = await client.users.fetch(id).catch(() => null);
                const name = member ? member.username : 'Người dùng đã rời';
                const medals = ['🥇', '🥈', '🥉'];
                const medal = i < 3 ? medals[i] : `${i+1}.`;
                leaderboard += `${medal} **${name}** - ${data.money} coins\n`;
            }
        }
        
        const embed = createEmbed('🏆 Bảng xếp hạng', leaderboard);
        return interaction.reply({ embeds: [embed] });
    }
    
    // ========== ADMIN COMMANDS ==========
    if (commandName === 'addmoney') {
        if (!isAdminUser) {
            return interaction.reply({ content: '❌ Bạn không có quyền sử dụng lệnh này!', ephemeral: true });
        }
        
        const target = options.getUser('user');
        const amount = options.getInteger('amount');
        
        if (isAdmin(target.id)) {
            return interaction.reply('❌ Không thể thêm tiền cho admin!');
        }
        
        const targetData = games.economy.get(target.id) || { money: 0, gamesPlayed: 0, wins: 0 };
        targetData.money += amount;
        games.economy.set(target.id, targetData);
        
        const embed = createEmbed(
            '💰 Admin đã thêm tiền',
            `✅ Đã thêm **${amount} coins** cho **${target.username}**\nSố dư hiện tại: **${targetData.money} coins**`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'resetmoney') {
        if (!isAdminUser) {
            return interaction.reply({ content: '❌ Bạn không có quyền sử dụng lệnh này!', ephemeral: true });
        }
        
        const target = options.getUser('user');
        
        if (isAdmin(target.id)) {
            return interaction.reply('❌ Không thể reset tiền của admin!');
        }
        
        const targetData = games.economy.get(target.id) || { money: 0, gamesPlayed: 0, wins: 0 };
        targetData.money = 0;
        games.economy.set(target.id, targetData);
        
        const embed = createEmbed(
            '🔄 Admin đã reset tiền',
            `✅ Đã reset tiền của **${target.username}** về 0`
        );
        return interaction.reply({ embeds: [embed] });
    }
    
    if (commandName === 'allusers') {
        if (!isAdminUser) {
            return interaction.reply({ content: '❌ Bạn không có quyền sử dụng lệnh này!', ephemeral: true });
        }
        
        const users = Array.from(games.economy.entries())
            .filter(([id]) => !id.startsWith('daily_') && !id.startsWith('work_'));
        
        if (users.length === 0) {
            return interaction.reply('📊 Chưa có người chơi nào!');
        }
        
        let list = '📊 **Danh sách người chơi**\n\n';
        for (const [id, data] of users) {
            const member = await client.users.fetch(id).catch(() => null);
            const name = member ? member.username : 'Đã rời server';
            const isAdminTag = isAdmin(id) ? ' 👑' : '';
            list += `**${name}**${isAdminTag}: ${data.money} coins\n`;
        }
        
        const embed = createEmbed('📊 Danh sách người chơi', list);
        return interaction.reply({ embeds: [embed] });
    }
});

// ========== START BOT ==========
client.once(Events.ClientReady, async (c) => {
    console.log(`✅ Bot đã sẵn sàng! Đăng nhập với tên: ${c.user.tag}`);
    console.log(`👑 Admin ID: ${ADMIN_ID}`);
    console.log(`🔄 Đang deploy slash commands...`);
    client.user.setActivity('🎮 /game để chơi', { type: 'PLAYING' });
    
    // Deploy commands khi bot khởi động
    await deployCommands();
});

// Xử lý lỗi
client.on(Events.Error, (error) => {
    console.error('❌ Lỗi bot:', error);
});

// Đăng nhập bot
client.login(TOKEN);

// Xử lý tắt bot
process.on('SIGINT', () => {
    console.log('🛑 Đang tắt bot...');
    client.destroy();
    process.exit();
});

process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});
// === Thêm web server để giữ bot chạy trên Render ===
const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('Bot is running!');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Web server is running on port ${port}`);
});
