import type { Schema, Struct } from '@strapi/strapi';

export interface AboutUsContentSection extends Struct.ComponentSchema {
  collectionName: 'components_about_us_content_sections';
  info: {
    description: '';
    displayName: 'ImageTextContentSection';
  };
  attributes: {
    Image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    Text: Schema.Attribute.Text & Schema.Attribute.Required;
    Title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface AboutUsNumericalContent extends Struct.ComponentSchema {
  collectionName: 'components_about_us_numerical_contents';
  info: {
    description: '';
    displayName: 'NumericalContentSection';
  };
  attributes: {
    Text: Schema.Attribute.String & Schema.Attribute.Required;
    Title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface AboutUsTile extends Struct.ComponentSchema {
  collectionName: 'components_about_us_tiles';
  info: {
    displayName: 'Tile';
  };
  attributes: {
    Image: Schema.Attribute.Media<'images'> & Schema.Attribute.Required;
    Text: Schema.Attribute.Text & Schema.Attribute.Required;
    Title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface AboutUsWhyUs extends Struct.ComponentSchema {
  collectionName: 'components_about_us_whyuses';
  info: {
    description: '';
    displayName: 'FramedTextContentSection';
  };
  attributes: {
    Tile: Schema.Attribute.Component<'about-us.tile', true>;
    Title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface ColorHexColorHex extends Struct.ComponentSchema {
  collectionName: 'components_color_hex_color_hexes';
  info: {
    displayName: 'ColorHex';
    icon: 'brush';
  };
  attributes: {
    Color: Schema.Attribute.String;
  };
}

export interface ColorImageColorImage extends Struct.ComponentSchema {
  collectionName: 'components_color_image_color_images';
  info: {
    displayName: 'ColorImage';
    icon: 'picture';
  };
  attributes: {
    Image: Schema.Attribute.Media<'images' | 'files'>;
  };
}

export interface FaqFaq extends Struct.ComponentSchema {
  collectionName: 'components_faq_faqs';
  info: {
    description: '';
    displayName: 'FAQ';
  };
  attributes: {
    Bookmark: Schema.Attribute.String & Schema.Attribute.Required;
    Question: Schema.Attribute.Component<'faq.faq-question', true>;
    Title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface FaqFaqQuestion extends Struct.ComponentSchema {
  collectionName: 'components_faq_faq_questions';
  info: {
    description: '';
    displayName: 'FaqQuestion';
  };
  attributes: {
    Text: Schema.Attribute.Text & Schema.Attribute.Required;
    Title: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomepageCta extends Struct.ComponentSchema {
  collectionName: 'components_homepage_ctas';
  info: {
    displayName: 'CTA';
  };
  attributes: {
    BtnLink: Schema.Attribute.String;
    BtnText: Schema.Attribute.String;
  };
}

export interface HomepageAnnouncementItem extends Struct.ComponentSchema {
  collectionName: 'components_homepage_announcement_items';
  info: {
    displayName: 'AnnouncementItem';
  };
  attributes: {
    Icon: Schema.Attribute.Enumeration<
      [
        'sparkles',
        'truck',
        'package',
        'shield-check',
        'badge-percent',
        'gift',
        'clock',
        'bell',
      ]
    >;
    Link: Schema.Attribute.String;
    Text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomepageFeatureTag extends Struct.ComponentSchema {
  collectionName: 'components_homepage_feature_tags';
  info: {
    displayName: 'FeatureTag';
  };
  attributes: {
    Text: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

export interface HomepageHeroBanner extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero_banners';
  info: {
    displayName: 'HeroBanner';
    icon: '';
  };
  attributes: {
    CTA: Schema.Attribute.Component<'homepage.cta', false>;
    Eyebrow: Schema.Attribute.String;
    FeatureTags: Schema.Attribute.Component<'homepage.feature-tag', true>;
    Headline: Schema.Attribute.String & Schema.Attribute.Required;
    Image: Schema.Attribute.Media<'images' | 'files'> &
      Schema.Attribute.Required;
    SecondaryCTA: Schema.Attribute.Component<'homepage.cta', false>;
    Text: Schema.Attribute.Text;
  };
}

export interface HomepageStat extends Struct.ComponentSchema {
  collectionName: 'components_homepage_stats';
  info: {
    displayName: 'Stat';
  };
  attributes: {
    Label: Schema.Attribute.String & Schema.Attribute.Required;
    Value: Schema.Attribute.String & Schema.Attribute.Required;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ComponentSchemas {
      'about-us.content-section': AboutUsContentSection;
      'about-us.numerical-content': AboutUsNumericalContent;
      'about-us.tile': AboutUsTile;
      'about-us.why-us': AboutUsWhyUs;
      'color-hex.color-hex': ColorHexColorHex;
      'color-image.color-image': ColorImageColorImage;
      'faq.faq': FaqFaq;
      'faq.faq-question': FaqFaqQuestion;
      'homepage.announcement-item': HomepageAnnouncementItem;
      'homepage.cta': HomepageCta;
      'homepage.feature-tag': HomepageFeatureTag;
      'homepage.hero-banner': HomepageHeroBanner;
      'homepage.stat': HomepageStat;
    }
  }
}
