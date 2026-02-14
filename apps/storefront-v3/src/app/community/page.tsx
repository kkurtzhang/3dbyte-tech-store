import type { Metadata } from 'next';
import { 
  MessageCircle, 
  Users, 
  Calendar, 
  Star, 
  ArrowRight,
  Discord,
  MessageSquare,
  CalendarDays
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Community | 3DByte Tech Store',
  description: 'Join our community of 3D printing enthusiasts. Connect on Discord, participate in forums, and attend events.',
};

export default function CommunityPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Join Our <span className="text-cyan-400">Community</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            Connect with thousands of 3D printing enthusiasts, share your creations, 
            learn from experts, and be part of the future of additive manufacturing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#discord" 
              className="inline-flex items-center justify-center px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-all duration-200"
            >
              <Discord className="w-5 h-5 mr-2" />
              Join Discord
            </a>
            <a 
              href="#features" 
              className="inline-flex items-center justify-center px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all duration-200 border border-slate-600"
            >
              Explore Community
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </div>
        </div>
      </section>

      {/* Community Features Section */}
      <section id="features" className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Three Ways to Connect
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose how you want to engage with our community. Every platform offers unique ways to learn, share, and grow.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Discord */}
            <div id="discord" className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-100">
              <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                <MessageCircle className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Discord Server</h3>
              <p className="text-slate-600 mb-6">
                Real-time conversations with over 10,000 members. Get help, share prints, 
                and chat with fellow enthusiasts in topic-specific channels.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-indigo-500 mr-2" />
                  10,000+ active members
                </li>
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-indigo-500 mr-2" />
                  50+ topic channels
                </li>
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-indigo-500 mr-2" />
                  Live help from experts
                </li>
              </ul>
              <a 
                href="#" 
                className="inline-flex items-center text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
              >
                Join Server <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>

            {/* Forum */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-100">
              <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Community Forum</h3>
              <p className="text-slate-600 mb-6">
                Deep-dive discussions, tutorials, and detailed troubleshooting. 
                Searchable archives mean answers are always just a click away.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-emerald-500 mr-2" />
                  25,000+ discussions
                </li>
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-emerald-500 mr-2" />
                  Expert tutorials
                </li>
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-emerald-500 mr-2" />
                  Print gallery
                </li>
              </ul>
              <a 
                href="#" 
                className="inline-flex items-center text-emerald-600 font-semibold hover:text-emerald-700 transition-colors"
              >
                Browse Forum <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>

            {/* Events */}
            <div className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-100">
              <div className="w-16 h-16 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <CalendarDays className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-3">Events & Meetups</h3>
              <p className="text-slate-600 mb-6">
                Virtual and in-person events ranging from print challenges to 
                maker meetups. Connect, compete, and celebrate with your community.
              </p>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-amber-500 mr-2" />
                  Monthly challenges
                </li>
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-amber-500 mr-2" />
                  Virtual meetups
                </li>
                <li className="flex items-center text-slate-700">
                  <Star className="w-4 h-4 text-amber-500 mr-2" />
                  Annual conference
                </li>
              </ul>
              <a 
                href="#" 
                className="inline-flex items-center text-amber-600 font-semibold hover:text-amber-700 transition-colors"
              >
                View Events <ArrowRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Member Testimonials */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              What Our Members Say
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Join thousands of satisfied members who've found their tribe in our community.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-slate-50 rounded-2xl p-8">
              <div className="flex items-center mb-4">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-slate-700 mb-6 italic">
                "The Discord community helped me troubleshoot my first layer issues. 
                Within an hour, I had solutions from multiple experienced makers. 
                This community is incredibly helpful!"
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  MK
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-slate-900">Michael K.</p>
                  <p className="text-sm text-slate-500">Member since 2023</p>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-slate-50 rounded-2xl p-8">
              <div className="flex items-center mb-4">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-slate-700 mb-6 italic">
                "I love the monthly print challenges! They've pushed me to try new 
                techniques and materials. The forum tutorials helped me go from 
                beginner to printing functional parts."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  SL
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-slate-900">Sarah L.</p>
                  <p className="text-sm text-slate-500">Member since 2022</p>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-slate-50 rounded-2xl p-8">
              <div className="flex items-center mb-4">
                <div className="flex text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-current" />
                  ))}
                </div>
              </div>
              <p className="text-slate-700 mb-6 italic">
                "Attended my first virtual meetup last month and it was amazing! 
                Great to connect with people who share the same passion. 
                The annual conference is a must-attend event."
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  JT
                </div>
                <div className="ml-4">
                  <p className="font-semibold text-slate-900">James T.</p>
                  <p className="text-sm text-slate-500">Member since 2024</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Users className="w-16 h-16 text-cyan-400 mx-auto mb-6" />
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to Join?
          </h2>
          <p className="text-xl text-slate-300 mb-8">
            Our community is growing every day. Come be part of something amazing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#" 
              className="inline-flex items-center justify-center px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-semibold rounded-lg transition-all duration-200"
            >
              <Discord className="w-5 h-5 mr-2" />
              Join Discord Now
            </a>
            <a 
              href="#" 
              className="inline-flex items-center justify-center px-8 py-4 bg-transparent hover:bg-slate-800 text-white font-semibold rounded-lg transition-all duration-200 border border-slate-600"
            >
              <Calendar className="w-5 h-5 mr-2" />
              View Upcoming Events
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
