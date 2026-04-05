import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  MapPin,
  Clock,
  DollarSign,
  Building2,
  Users,
  Bookmark,
  BookmarkPlus,
  Share2,
  ArrowLeft,
  TrendingUp,
  CheckCircle2,
  Briefcase,
  ExternalLink,
} from "lucide-react";

// Mock job data (in a real app, this would come from an API)
const mockJobs = [
  {
    id: 1,
    title: "Senior Full Stack Developer",
    company: "TechStartup Manila",
    companyLogo: "https://images.unsplash.com/photo-1549923746-c502d488b3ea?w=100&h=100&fit=crop",
    location: "Manila, Philippines",
    type: "Full-time",
    salary: "₱80,000 - ₱120,000/month",
    postedBy: {
      name: "Angela Torres",
      username: "angelat",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    },
    postedAt: "2 hours ago",
    applicants: 24,
    description: "We're looking for an experienced full stack developer to join our growing team. Must have experience with React, Node.js, and PostgreSQL.",
    fullDescription: "TechStartup Manila is seeking a Senior Full Stack Developer to join our dynamic team. You'll be working on cutting-edge web applications that serve thousands of users across the Philippines.\n\nResponsibilities:\n• Design and develop scalable web applications\n• Collaborate with cross-functional teams\n• Write clean, maintainable code\n• Mentor junior developers\n• Participate in code reviews\n\nRequirements:\n• 5+ years of full stack development experience\n• Strong proficiency in React and Node.js\n• Experience with PostgreSQL or similar databases\n• Knowledge of TypeScript\n• Experience with AWS or other cloud platforms\n• Excellent problem-solving skills\n\nWhat We Offer:\n• Competitive salary\n• Health insurance\n• Flexible work arrangements\n• Learning and development budget\n• Modern office in Makati",
    tags: ["React", "Node.js", "PostgreSQL", "TypeScript", "Remote OK"],
    featured: true,
  },
  {
    id: 2,
    title: "UI/UX Designer",
    company: "Design Studio PH",
    companyLogo: "https://images.unsplash.com/photo-1572044162444-ad60f128bdea?w=100&h=100&fit=crop",
    location: "Quezon City, Philippines",
    type: "Full-time",
    salary: "₱50,000 - ₱80,000/month",
    postedBy: {
      name: "Maria Santos",
      username: "mariasantos",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    },
    postedAt: "5 hours ago",
    applicants: 18,
    description: "Seeking a creative UI/UX designer with a strong portfolio. Experience with Figma and Adobe Creative Suite required.",
    fullDescription: "Design Studio PH is looking for a talented UI/UX Designer to create beautiful and intuitive user experiences for our clients.\n\nResponsibilities:\n• Create wireframes, prototypes, and high-fidelity designs\n• Conduct user research and usability testing\n• Collaborate with developers and product managers\n• Maintain design systems and documentation\n• Present design concepts to stakeholders\n\nRequirements:\n• 3+ years of UI/UX design experience\n• Expert knowledge of Figma\n• Experience with Adobe Creative Suite\n• Strong portfolio demonstrating design skills\n• Understanding of design principles and best practices\n• Excellent communication skills\n\nWhat We Offer:\n• Competitive compensation\n• Creative and collaborative work environment\n• Latest design tools and software\n• Professional development opportunities",
    tags: ["Figma", "Adobe XD", "UI Design", "UX Research", "Prototyping"],
    featured: false,
  },
  {
    id: 3,
    title: "Frontend Developer (React)",
    company: "E-commerce Solutions Inc",
    companyLogo: "https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop",
    location: "Makati, Philippines",
    type: "Contract",
    salary: "₱60,000 - ₱90,000/month",
    postedBy: {
      name: "Carlos Reyes",
      username: "carlosr",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    },
    postedAt: "1 day ago",
    applicants: 32,
    description: "Join our e-commerce platform team as a frontend developer. Must be proficient in React, Next.js, and Tailwind CSS.",
    fullDescription: "E-commerce Solutions Inc is hiring a Frontend Developer for a 6-month contract with possibility of extension.\n\nResponsibilities:\n• Build responsive and performant web applications\n• Implement pixel-perfect designs\n• Optimize applications for maximum speed\n• Collaborate with backend developers\n• Write unit and integration tests\n\nRequirements:\n• 2+ years of React experience\n• Proficiency in Next.js and Tailwind CSS\n• Understanding of responsive design\n• Experience with Git and modern development workflows\n• Strong attention to detail\n\nWhat We Offer:\n• Competitive contract rate\n• Flexible schedule\n• Remote work options\n• Opportunity for full-time conversion",
    tags: ["React", "Next.js", "Tailwind CSS", "JavaScript", "6-month contract"],
    featured: true,
  },
];

export function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  // Find the job by ID
  const job = mockJobs.find((j) => j.id === Number(id));

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="border max-w-md w-full">
          <CardContent className="p-12 text-center">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" strokeWidth={2} />
            <h3 className="font-semibold mb-2">Job not found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              The job listing you're looking for doesn't exist.
            </p>
            <Button onClick={() => navigate("/jobs")}>
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationSubmitted(true);
    setTimeout(() => {
      setIsApplyOpen(false);
      setApplicationSubmitted(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="gap-2 mb-6"
          onClick={() => navigate("/jobs")}
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Back to Jobs
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="border">
              <CardContent className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={job.companyLogo}
                    alt={job.company}
                    className="w-20 h-20 rounded-lg border-2 border-border object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h1 className="text-3xl font-bold">{job.title}</h1>
                      {job.featured && (
                        <Badge className="gap-1 flex-shrink-0">
                          <TrendingUp className="w-3 h-3" strokeWidth={2} />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <Building2 className="w-4 h-4" strokeWidth={2} />
                      <span className="font-medium">{job.company}</span>
                    </div>
                    <p className="text-muted-foreground">{job.description}</p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="gap-2"
                    onClick={() => setIsApplyOpen(true)}
                  >
                    Apply Now
                  </Button>
                  <Button
                    variant={isSaved ? "default" : "outline"}
                    size="lg"
                    className="gap-2"
                    onClick={() => setIsSaved(!isSaved)}
                  >
                    {isSaved ? (
                      <>
                        <Bookmark className="w-4 h-4" strokeWidth={2} fill="currentColor" />
                        Saved
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-4 h-4" strokeWidth={2} />
                        Save Job
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Share2 className="w-4 h-4" strokeWidth={2} />
                    Share
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Job Details */}
            <Card className="border">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Job Description</h2>
                <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {job.fullDescription}
                </div>
              </CardContent>
            </Card>

            {/* Skills/Tags */}
            <Card className="border">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {job.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-sm">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Job Info Card */}
            <Card className="border">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-bold text-lg mb-4">Job Information</h3>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Location</p>
                      <p className="font-medium">{job.location}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Job Type</p>
                      <p className="font-medium">{job.type}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Salary Range</p>
                      <p className="font-medium">{job.salary}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-start gap-3">
                    <Users className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Applicants</p>
                      <p className="font-medium">{job.applicants} people</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posted By Card */}
            <Card className="border">
              <CardContent className="p-6">
                <h3 className="font-bold text-lg mb-4">Posted By</h3>
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={job.postedBy.avatar} />
                    <AvatarFallback>{job.postedBy.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{job.postedBy.name}</p>
                    <Link
                      to={`/profile?user=${job.postedBy.username}`}
                      className="text-sm text-primary hover:underline"
                    >
                      @{job.postedBy.username}
                    </Link>
                    <p className="text-xs text-muted-foreground mt-1">
                      Posted {job.postedAt}
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4 gap-2">
                  <ExternalLink className="w-4 h-4" strokeWidth={2} />
                  View Profile
                </Button>
              </CardContent>
            </Card>

            {/* Apply CTA Card */}
            <Card className="border border-primary/30 bg-primary/5">
              <CardContent className="p-6 text-center">
                <h3 className="font-bold text-lg mb-2">Interested?</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Apply now and join the team!
                </p>
                <Button
                  size="lg"
                  className="w-full"
                  onClick={() => setIsApplyOpen(true)}
                >
                  Apply for this Position
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Apply Now Dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="max-w-2xl">
          {!applicationSubmitted && (
            <>
              <DialogHeader>
                <DialogTitle>Apply for {job.title}</DialogTitle>
                <DialogDescription>
                  at {job.company}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmitApplication} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" placeholder="Juan" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" placeholder="Dela Cruz" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" placeholder="juan@example.com" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input id="phone" type="tel" placeholder="+63 912 345 6789" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="portfolio">Portfolio / LinkedIn</Label>
                  <Input id="portfolio" type="url" placeholder="https://linkedin.com/in/yourprofile" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resume">Resume / CV *</Label>
                  <div className="flex items-center gap-2">
                    <Input id="resume" type="file" accept=".pdf,.doc,.docx" required />
                  </div>
                  <p className="text-xs text-muted-foreground">PDF, DOC, or DOCX (Max 5MB)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="coverLetter">Cover Letter *</Label>
                  <Textarea
                    id="coverLetter"
                    placeholder="Tell us why you're a great fit for this position..."
                    rows={6}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsApplyOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Submit Application
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {applicationSubmitted && (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" strokeWidth={2} />
              <h3 className="text-xl font-bold mb-2">Application Submitted!</h3>
              <p className="text-muted-foreground">
                Your application has been successfully submitted. The employer will review it and contact you soon.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
