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

export interface HomepageHeroBanner extends Struct.ComponentSchema {
  collectionName: 'components_homepage_hero_banners';
  info: {
    displayName: 'HeroBanner';
    icon: '';
  };
  attributes: {
    CTA: Schema.Attribute.Component<'homepage.cta', false>;
    Headline: Schema.Attribute.String & Schema.Attribute.Required;
    Image: Schema.Attribute.Media<'images' | 'files'> &
      Schema.Attribute.Required;
    Text: Schema.Attribute.Text;
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
      'homepage.cta': HomepageCta;
      'homepage.hero-banner': HomepageHeroBanner;
    }
  }
}
