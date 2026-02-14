import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about 3DByte Tech and our mission to bring cutting-edge technology to everyone.",
};

export default function AboutPage() {
  return (
    <div className="container py-12 md:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          About 3DByte Tech
        </h1>
        <p className="text-lg text-muted-foreground">
          Your trusted source for cutting-edge technology products.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
        {/* Mission Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
          <p className="text-muted-foreground mb-4">
            At 3DByte Tech, we believe technology should be accessible to everyone. 
            We curate the best 3D printers, components, and tech products to help 
            makers, engineers, and enthusiasts bring their ideas to life.
          </p>
          <p className="text-muted-foreground">
            Founded with a passion for innovation, we strive to provide quality 
            products, expert support, and a community where creativity thrives.
          </p>
        </section>

        {/* Values Section */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Our Values</h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span><strong>Quality:</strong> We only sell products we trust and use ourselves.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span><strong>Support:</strong> Expert help when you need it most.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span><strong>Community:</strong> Building together, learning together.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">✓</span>
              <span><strong>Innovation:</strong> Always exploring the cutting edge.</span>
            </li>
          </ul>
        </section>
      </div>

      {/* Team Section */}
      <section className="mt-16">
        <h2 className="text-2xl font-semibold mb-8">Our Team</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: "Kurt Zhang", role: "CEO & Co-founder" },
            { name: "Team Member", role: "CTO & Co-founder" },
            { name: "Team Member", role: "Head of Operations" },
            { name: "Team Member", role: "Customer Success" },
          ].map((member, index) => (
            <div 
              key={index} 
              className="rounded-lg border bg-card p-6 text-center"
            >
              <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground">
                {member.name.charAt(0)}
              </div>
              <h3 className="font-semibold">{member.name}</h3>
              <p className="text-sm text-muted-foreground">{member.role}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
