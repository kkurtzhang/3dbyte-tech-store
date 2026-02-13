const strapi = require('@strapi/strapi');

async function seed() {
  const app = strapi({ appDir: __dirname });
  await app.start();

  console.log('Starting blog content seed...');

  // 1. Create blog categories
  const categories = [
    { Title: 'Technology', Slug: 'technology' },
    { Title: 'Product Updates', Slug: 'product-updates' },
    { Title: 'Company News', Slug: 'company-news' },
    { Title: 'Tutorials', Slug: 'tutorials' }
  ];

  console.log('Creating blog categories...');
  const createdCategories = [];
  for (const category of categories) {
    try {
      const existing = await strapi.query('api::blog-post-category.blog-post-category').findOne({
        where: { Slug: category.Slug }
      });

      if (!existing) {
        const created = await strapi.entityService.create('api::blog-post-category.blog-post-category', {
          data: {
            ...category,
            publishedAt: new Date()
          }
        });
        createdCategories.push(created);
        console.log(`✓ Created category: ${category.Title}`);
      } else {
        createdCategories.push(existing);
        console.log(`  Category already exists: ${category.Title}`);
      }
    } catch (error) {
      console.error(`✗ Error creating category ${category.Title}:`, error.message);
    }
  }

  // 2. Create sample blog posts
  const blogPosts = [
    {
      Title: 'Welcome to Our New Blog',
      Slug: 'welcome-to-our-new-blog',
      Content: `
        <h2>Welcome to Our Blog!</h2>
        <p>We're excited to launch our new blog where we'll share updates about our products, company news, and helpful tutorials.</p>
        <h3>What to Expect</h3>
        <p>Here, you'll find:</p>
        <ul>
          <li>Latest product updates and features</li>
          <li>Behind-the-scenes looks at our development process</li>
          <li>Tutorials to help you get the most out of our products</li>
          <li>Industry news and insights</li>
        </ul>
        <p>Stay tuned for more exciting content!</p>
      `,
      Excerpt: 'Welcome to our new blog! We\'ll be sharing product updates, company news, and tutorials.',
      Categories: ['technology', 'company-news']
    },
    {
      Title: 'Top 10 Productivity Tips for Developers',
      Slug: 'top-10-productivity-tips-for-developers',
      Content: `
        <h2>Top 10 Productivity Tips for Developers</h2>
        <p>As developers, we're always looking for ways to work smarter, not harder. Here are our top productivity tips.</p>
        <h3>1. Use Keyboard Shortcuts</h3>
        <p>Learn your IDE's keyboard shortcuts. They can save you hours every week.</p>
        <h3>2. Automate Repetitive Tasks</h3>
        <p>If you find yourself doing something more than twice, automate it!</p>
        <h3>3. Take Regular Breaks</h3>
        <p>The Pomodoro Technique is great for maintaining focus and avoiding burnout.</p>
        <h3>4. Write Clean Code</h3>
        <p>Clean code is easier to read, debug, and maintain.</p>
        <h3>5. Use Version Control Effectively</h3>
        <p>Make small, frequent commits with meaningful messages.</p>
        <h3>6. Stay Organized</h3>
        <p>Keep your workspace digital and physical organized.</p>
        <h3>7. Learn Continuously</h3>
        <p>Technology changes fast. Set aside time for learning new skills.</p>
        <h3>8. Collaborate Effectively</h3>
        <p>Good communication with your team can prevent many problems.</p>
        <h3>9. Test Your Code</h3>
        <p>Write tests to catch bugs early and ensure code quality.</p>
        <h3>10. Take Care of Yourself</h3>
        <p>Your health is more important than any deadline. Get enough sleep, exercise, and maintain work-life balance.</p>
      `,
      Excerpt: 'Discover our top 10 productivity tips to help developers work smarter and more efficiently.',
      Categories: ['tutorials', 'technology']
    },
    {
      Title: 'Introducing Our Latest Product Feature',
      Slug: 'introducing-our-latest-product-feature',
      Content: `
        <h2>New Feature Announcement</h2>
        <p>We're thrilled to announce our latest product feature that will revolutionize the way you work!</p>
        <h3>What's New</h3>
        <p>This update includes several enhancements:</p>
        <ul>
          <li>Improved performance and speed</li>
          <li>New dashboard with real-time analytics</li>
          <li>Enhanced security features</li>
          <li>Better integration with third-party tools</li>
          <li>Mobile app updates</li>
        </ul>
        <h3>How to Get Started</h3>
        <p>The update is available now! Simply log in to your account and you'll be prompted to update. The process takes less than 5 minutes.</p>
        <h3>Need Help?</h3>
        <p>Check out our documentation or contact our support team if you have any questions.</p>
      `,
      Excerpt: 'Exciting news! We\'ve just released a major update with new features and improvements.',
      Categories: ['product-updates']
    },
    {
      Title: 'Behind the Scenes: How We Build Quality Software',
      Slug: 'behind-the-scenes-how-we-build-quality-software',
      Content: `
        <h2>Our Development Process</h2>
        <p>Ever wondered how we build software? Let us take you behind the scenes!</p>
        <h3>Planning & Design</h3>
        <p>Every great product starts with great planning. We spend significant time understanding user needs and designing solutions that really work.</p>
        <h3>Agile Development</h3>
        <p>We use agile methodologies to deliver value quickly and iterate based on feedback. Our sprints are two weeks long.</p>
        <h3>Code Quality</h3>
        <p>Quality is built into our process. Every line of code goes through code review, automated testing, and quality checks.</p>
        <h3>Testing</h3>
        <p>We believe in testing everything. Unit tests, integration tests, and end-to-end tests ensure our software is reliable.</p>
        <h3>Deployment</h3>
        <p>Our CI/CD pipeline ensures smooth deployments with minimal downtime. We can deploy multiple times a day if needed.</p>
        <h3>Monitoring & Support</h3>
        <p>We continuously monitor our systems and respond quickly to any issues. Our support team is always ready to help.</p>
      `,
      Excerpt: 'Take a look behind the scenes at our software development process and quality standards.',
      Categories: ['company-news', 'technology']
    }
  ];

  console.log('\nCreating blog posts...');
  for (const post of blogPosts) {
    try {
      const existing = await strapi.query('api::blog.blog').findOne({
        where: { Slug: post.Slug }
      });

      if (!existing) {
        // Find category IDs
        const categoryIds = [];
        for (const catSlug of post.Categories) {
          const cat = createdCategories.find(c => c.Slug === catSlug);
          if (cat) {
            categoryIds.push(cat.id);
          }
        }

        const created = await strapi.entityService.create('api::blog.blog', {
          data: {
            Title: post.Title,
            Slug: post.Slug,
            Content: post.Content,
            Excerpt: post.Excerpt,
            Categories: categoryIds,
            publishedAt: new Date()
          }
        });
        console.log(`✓ Created blog post: ${post.Title}`);
      } else {
        console.log(`  Blog post already exists: ${post.Title}`);
      }
    } catch (error) {
      console.error(`✗ Error creating blog post ${post.Title}:`, error.message);
    }
  }

  console.log('\n✓ Seed completed successfully!');
  console.log(`Created ${createdCategories.length} categories`);
  console.log('Created multiple blog posts');

  await app.stop();
  process.exit(0);
}

seed().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
