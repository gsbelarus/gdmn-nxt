import facebook from './facebook.png';
import instagram from './instagram.png';
import whatsApp from './whatsApp.png';
import skype from './skype.png';
import telegram from './telegram.png';
import vk from './vk.png';
import linkedin from './linkedin.png';
import ok from './ok.png';
import github from './github.png';
import viber from './viber.png';
import discord from './discord.png';
import { MessengerCode } from '@gsbelarus/util-api-types';

type ISocialMediaIcons = {
  [key in MessengerCode]: {
    icon: string,
    link?: string
  };
}

export const socialMediaIcons: ISocialMediaIcons = {
  'facebook': { icon: facebook, link: 'https://www.facebook.com/' },
  'instagram': { icon: instagram, link: 'https://vk.com/' },
  'telegram': { icon: telegram, link: 'https://t.me/' },
  'viber': { icon: viber },
  'linkedin': { icon: linkedin, link: 'https://www.linkedin.com/in/' },
  'skype': { icon: skype },
  'ok': { icon: ok, link: 'https://ok.ru/profile/' },
  'whatsApp': { icon: whatsApp },
  'github': { icon: github, link: 'https://github.com/' },
  'vk': { icon: vk, link: 'https://vk.com/' },
  'discord': { icon: discord }
};
