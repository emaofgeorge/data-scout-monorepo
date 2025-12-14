import { Telegraf, Context, Markup } from 'telegraf';
import { Update } from 'telegraf/types';
import { BotUserService } from './bot-user.service';
import { IkeaStore } from '@data-scout/shared-types';

export interface TelegramBotConfig {
  token: string;
  webhookUrl?: string; // For production
  availableStores: IkeaStore[];
}

/**
 * Telegram Bot Handler for IKEA Circularity
 */
export class IkeaTelegramBot {
  private bot: Telegraf<Context<Update>>;
  private userService: BotUserService;
  private availableStores: IkeaStore[];

  constructor(config: TelegramBotConfig) {
    this.bot = new Telegraf(config.token);
    this.userService = new BotUserService();
    this.availableStores = config.availableStores;

    this.setupCommands();
  }

  private setupCommands(): void {
    // Tastiera menu principale (reply)
    const mainMenuKeyboard = Markup.keyboard([
      ['🛒 Store', '⚙️ Preferenze'],
      ['📍 I miei store', '❓ Aiuto'],
    ]).resize();

    // Start command
    this.bot.command('start', async (ctx) => {
      const userId = ctx.from.id.toString();
      const chatId = ctx.chat.id.toString();

      await this.userService.getOrCreateUser(
        userId,
        chatId,
        'ikea-circularity',
        {
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
        }
      );

      await ctx.reply(
        `👋 Benvenuto nel Bot IKEA Circularity!\n\n` +
          `Ricevi notifiche sui prodotti second-hand IKEA.\n\n` +
          `Usa la tastiera qui sotto per accedere alle funzioni principali.`,
        mainMenuKeyboard
      );
    });

    // Menu command
    this.bot.command('menu', async (ctx) => {
      await ctx.reply('Menu principale:', mainMenuKeyboard);
    });

    // Gestione tastiera reply con chiamata diretta ai comandi
    this.bot.hears('🛒 Store', async (ctx) => {
      // Simula comando /stores
      const userId = ctx.from.id.toString();
      const prefs = await this.userService.getUserPreferences(
        userId,
        'ikea-circularity'
      );
      const subscribedStores = prefs?.preferences.subscribedStores || [];
      const keyboard = this.availableStores.map((store) => {
        const isSubscribed = subscribedStores.includes(store.id);
        return [
          Markup.button.callback(
            `${isSubscribed ? '✅' : '⬜'} ${store.name} (${store.city})`,
            `toggle_${store.id}`
          ),
        ];
      });
      keyboard.push([Markup.button.callback('🔙 Indietro', 'back_menu')]);
      await ctx.reply('Seleziona gli store da monitorare:', {
        reply_markup: {
          inline_keyboard: keyboard,
          remove_keyboard: true,
        },
      });
    });
    this.bot.hears('⚙️ Preferenze', async (ctx) => {
      // Simula comando /preferences
      const userId = ctx.from.id.toString();
      let prefs = await this.userService.getUserPreferences(
        userId,
        'ikea-circularity'
      );
      if (!prefs) {
        prefs = await this.userService.initializePreferences(
          userId,
          'ikea-circularity'
        );
      }
      const keyboard = [
        [
          Markup.button.callback(
            `${
              prefs.preferences.notifyOnNewProducts ? '✅' : '⬜'
            } Nuovi prodotti`,
            'pref_new_products'
          ),
        ],
        [
          Markup.button.callback(
            `${
              prefs.preferences.notifyOnRemovedProducts ? '✅' : '⬜'
            } Prodotti rimossi`,
            'pref_removed_products'
          ),
        ],
        [
          Markup.button.callback(
            `${
              prefs.preferences.notifyOnPriceChanges ? '✅' : '⬜'
            } Cambio prezzi`,
            'pref_price_changes'
          ),
        ],
        [Markup.button.callback('🔙 Indietro', 'back_menu')],
      ];
      await ctx.reply(
        '⚙️ <b>Preferenze Notifiche</b>\n\n' +
          'Seleziona quali notifiche ricevere:',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard,
            remove_keyboard: true,
          },
        }
      );
    });
    this.bot.hears('📍 I miei store', async (ctx) => {
      // Simula comando /mystores
      const userId = ctx.from.id.toString();
      const prefs = await this.userService.getUserPreferences(
        userId,
        'ikea-circularity'
      );
      if (!prefs || prefs.preferences.subscribedStores.length === 0) {
        await ctx.reply(
          '📭 Non hai ancora selezionato alcuno store.\n\n' +
            'Usa /stores per iniziare a monitorare i prodotti!'
        );
        return;
      }
      const storeNames = prefs.preferences.subscribedStores
        .map((storeId: string) => {
          const store = this.availableStores.find((s) => s.id === storeId);
          return store ? `• ${store.name} (${store.city})` : null;
        })
        .filter(Boolean)
        .join('\n');
      await ctx.reply(
        `📍 <b>I tuoi store monitorati:</b>\n\n${storeNames}\n\n` +
          `Usa /stores per modificare le tue selezioni.`,
        { parse_mode: 'HTML' }
      );
    });
    this.bot.hears('❓ Aiuto', async (ctx) => {
      // Simula comando /help
      await ctx.reply(
        `📖 <b>Guida Bot IKEA Circularity</b>\n\n` +
          `<b>Comandi:</b>\n` +
          `/start - Avvia il bot\n` +
          `/stores - Seleziona store da monitorare\n` +
          `/mystores - I tuoi store attivi\n` +
          `/preferences - Modifica preferenze notifiche\n` +
          `/help - Questa guida\n\n` +
          `<b>Notifiche:</b>\n` +
          `• 🆕 Nuovi prodotti aggiunti\n` +
          `• 🔴 Prodotti venduti/rimossi\n` +
          `• 💰 Sconti e prezzi interessanti`,
        { parse_mode: 'HTML' }
      );
    });

    // Help command
    this.bot.command('help', async (ctx) => {
      await ctx.reply(
        `📖 <b>Guida Bot IKEA Circularity</b>\n\n` +
          `<b>Comandi:</b>\n` +
          `/start - Avvia il bot\n` +
          `/stores - Seleziona store da monitorare\n` +
          `/mystores - I tuoi store attivi\n` +
          `/preferences - Modifica preferenze notifiche\n` +
          `/help - Questa guida\n\n` +
          `<b>Notifiche:</b>\n` +
          `• 🆕 Nuovi prodotti aggiunti\n` +
          `• 🔴 Prodotti venduti/rimossi\n` +
          `• 💰 Sconti e prezzi interessanti`,
        { parse_mode: 'HTML' }
      );
    });

    // Stores command - Show all available stores
    this.bot.command('stores', async (ctx) => {
      const userId = ctx.from.id.toString();
      const prefs = await this.userService.getUserPreferences(
        userId,
        'ikea-circularity'
      );

      const subscribedStores = prefs?.preferences.subscribedStores || [];

      const keyboard = this.availableStores.map((store) => {
        const isSubscribed = subscribedStores.includes(store.id);
        return [
          Markup.button.callback(
            `${isSubscribed ? '✅' : '⬜'} ${store.name} (${store.city})`,
            `toggle_${store.id}`
          ),
        ];
      });
      // Bottone indietro
      keyboard.push([Markup.button.callback('🔙 Indietro', 'back_menu')]);

      await ctx.reply('Seleziona gli store da monitorare:', {
        reply_markup: {
          inline_keyboard: keyboard,
          remove_keyboard: true,
        },
      });
    });

    // My stores command
    this.bot.command('mystores', async (ctx) => {
      const userId = ctx.from.id.toString();
      const prefs = await this.userService.getUserPreferences(
        userId,
        'ikea-circularity'
      );

      if (!prefs || prefs.preferences.subscribedStores.length === 0) {
        await ctx.reply(
          '📭 Non hai ancora selezionato alcuno store.\n\n' +
            'Usa /stores per iniziare a monitorare i prodotti!'
        );
        return;
      }

      const storeNames = prefs.preferences.subscribedStores
        .map((storeId: string) => {
          const store = this.availableStores.find((s) => s.id === storeId);
          return store ? `• ${store.name} (${store.city})` : null;
        })
        .filter(Boolean)
        .join('\n');

      await ctx.reply(
        `📍 <b>I tuoi store monitorati:</b>\n\n${storeNames}\n\n` +
          `Usa /stores per modificare le tue selezioni.`,
        { parse_mode: 'HTML' }
      );
    });

    // Preferences command
    this.bot.command('preferences', async (ctx) => {
      const userId = ctx.from.id.toString();
      let prefs = await this.userService.getUserPreferences(
        userId,
        'ikea-circularity'
      );

      if (!prefs) {
        prefs = await this.userService.initializePreferences(
          userId,
          'ikea-circularity'
        );
      }

      const keyboard = [
        [
          Markup.button.callback(
            `${
              prefs.preferences.notifyOnNewProducts ? '✅' : '⬜'
            } Nuovi prodotti`,
            'pref_new_products'
          ),
        ],
        [
          Markup.button.callback(
            `${
              prefs.preferences.notifyOnRemovedProducts ? '✅' : '⬜'
            } Prodotti rimossi`,
            'pref_removed_products'
          ),
        ],
        [
          Markup.button.callback(
            `${
              prefs.preferences.notifyOnPriceChanges ? '✅' : '⬜'
            } Cambio prezzi`,
            'pref_price_changes'
          ),
        ],
        [Markup.button.callback('🔙 Indietro', 'back_menu')],
      ];

      await ctx.reply(
        '⚙️ <b>Preferenze Notifiche</b>\n\n' +
          'Seleziona quali notifiche ricevere:',
        {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard,
            remove_keyboard: true,
          },
        }
      );
    });

    // Handle callback queries (button clicks)
    this.bot.on('callback_query', async (ctx) => {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

      const data = ctx.callbackQuery.data;
      const userId = ctx.from.id.toString();

      // Bottone indietro
      if (data === 'back_menu') {
        // Rimuovi tastiera inline
        await ctx.editMessageReplyMarkup({ inline_keyboard: [] });
        // Mostra tastiera reply menu
        await ctx.reply('Menu principale:', mainMenuKeyboard);
        return;
      }

      // Toggle store subscription
      if (data.startsWith('toggle_')) {
        const storeId = data.replace('toggle_', '');
        const prefs = await this.userService.getUserPreferences(
          userId,
          'ikea-circularity'
        );

        const isSubscribed =
          prefs?.preferences.subscribedStores.includes(storeId) || false;

        if (isSubscribed) {
          await this.userService.unsubscribeFromStore(userId, storeId);
          await ctx.answerCbQuery('✅ Store rimosso');
        } else {
          await this.userService.subscribeToStore(userId, storeId);
          await ctx.answerCbQuery('✅ Store aggiunto');
        }

        // Refresh keyboard
        const updatedPrefs = await this.userService.getUserPreferences(
          userId,
          'ikea-circularity'
        );
        const subscribedStores =
          updatedPrefs?.preferences.subscribedStores || [];

        const keyboard = this.availableStores.map((store) => {
          const isSub = subscribedStores.includes(store.id);
          return [
            Markup.button.callback(
              `${isSub ? '✅' : '⬜'} ${store.name} (${store.city})`,
              `toggle_${store.id}`
            ),
          ];
        });

        await ctx.editMessageReplyMarkup({
          inline_keyboard: keyboard,
        });
      }

      // Toggle preferences
      if (data.startsWith('pref_')) {
        const prefType = data.replace('pref_', '');
        let prefs = await this.userService.getUserPreferences(
          userId,
          'ikea-circularity'
        );

        if (!prefs) {
          prefs = await this.userService.initializePreferences(
            userId,
            'ikea-circularity'
          );
        }

        // Toggle preference
        if (prefType === 'new_products') {
          await this.userService.updatePreferences(userId, {
            notifyOnNewProducts: !prefs.preferences.notifyOnNewProducts,
          });
        } else if (prefType === 'removed_products') {
          await this.userService.updatePreferences(userId, {
            notifyOnRemovedProducts: !prefs.preferences.notifyOnRemovedProducts,
          });
        } else if (prefType === 'price_changes') {
          await this.userService.updatePreferences(userId, {
            notifyOnPriceChanges: !prefs.preferences.notifyOnPriceChanges,
          });
        }

        await ctx.answerCbQuery('✅ Preferenza aggiornata');

        // Refresh keyboard
        const updatedPrefs = await this.userService.getUserPreferences(
          userId,
          'ikea-circularity'
        );

        if (updatedPrefs) {
          const keyboard = [
            [
              Markup.button.callback(
                `${
                  updatedPrefs.preferences.notifyOnNewProducts ? '✅' : '⬜'
                } Nuovi prodotti`,
                'pref_new_products'
              ),
            ],
            [
              Markup.button.callback(
                `${
                  updatedPrefs.preferences.notifyOnRemovedProducts ? '✅' : '⬜'
                } Prodotti rimossi`,
                'pref_removed_products'
              ),
            ],
            [
              Markup.button.callback(
                `${
                  updatedPrefs.preferences.notifyOnPriceChanges ? '✅' : '⬜'
                } Cambio prezzi`,
                'pref_price_changes'
              ),
            ],
            [Markup.button.callback('🔙 Indietro', 'back_menu')],
          ];

          await ctx.editMessageReplyMarkup({
            inline_keyboard: keyboard,
          });
        }
      }
    });

    // Handle bot blocked by user
    this.bot.catch(async (err: unknown, ctx: Context) => {
      if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as any).response === 'object' &&
        (err as any).response !== null &&
        'error_code' in (err as any).response &&
        (err as any).response.error_code === 403
      ) {
        // User blocked the bot
        const userId = ctx.from?.id.toString();
        if (userId) {
          await this.userService.deactivateUser(userId);
          // Optionally remove preferences when user blocks the bot
          if (process.env.CLEAR_PREFS_ON_UNSUBSCRIBE === 'true') {
            try {
              await this.userService.deletePreferences(
                userId,
                'ikea-circularity'
              );
            } catch (err) {
              console.error('Failed to delete preferences after block:', err);
            }
          }
        }
      }
      console.error('Bot error:', err);
    });

    // Handle chat membership changes (user removes bot or leaves)
    this.bot.on('my_chat_member', async (ctx) => {
      try {
        const update = ctx.update as Update;
        // `my_chat_member` update is not present on all Update variants in types, narrow safely
        const myChat = (update as any).my_chat_member;
        const newStatus = myChat?.new_chat_member?.status || '';
        const chatId =
          myChat?.chat?.id?.toString() ||
          (ctx.chat?.id ? ctx.chat.id.toString() : ctx.from?.id?.toString());

        // statuses: 'kicked', 'left' indicate the bot was removed/unavailable
        if (chatId && (newStatus === 'kicked' || newStatus === 'left')) {
          const userId = chatId;
          console.log(
            `User ${userId} removed the bot (status: ${newStatus}), deactivating.`
          );
          await this.userService.deactivateUser(userId);
          if (process.env.CLEAR_PREFS_ON_UNSUBSCRIBE === 'true') {
            try {
              await this.userService.deletePreferences(
                userId,
                'ikea-circularity'
              );
            } catch (err) {
              console.error(
                'Failed to delete preferences after my_chat_member:',
                err
              );
            }
          }
        }
      } catch (err) {
        console.error('Error handling my_chat_member update:', err);
      }
    });
  }

  /**
   * Start bot with long polling (for development)
   */
  public async startPolling(): Promise<void> {
    console.log('🤖 Starting Telegram bot (polling mode)...');
    await this.bot.launch();
    console.log('✅ Bot is running');
  }

  /**
   * Set webhook (for production)
   */
  public async setWebhook(webhookUrl: string): Promise<void> {
    await this.bot.telegram.setWebhook(webhookUrl);
    console.log(`✅ Webhook set to: ${webhookUrl}`);
  }

  /**
   * Handle webhook update
   */
  public async handleWebhook(update: Update): Promise<void> {
    await this.bot.handleUpdate(update);
  }

  /**
   * Stop bot
   */
  public async stop(): Promise<void> {
    this.bot.stop();
  }

  /**
   * Get bot instance (for webhook integration with Express/Fastify)
   */
  public getBotInstance(): Telegraf<Context<Update>> {
    return this.bot;
  }
}
