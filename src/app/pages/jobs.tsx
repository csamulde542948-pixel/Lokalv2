import { useState } from "react";
import { useNavigate } from "react-router";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  DollarSign,
  Building2,
  Search,
  Filter,
  BookmarkPlus,
  ExternalLink,
  Bookmark,
  TrendingUp,
  Users,
  Code2,
  Palette,
  Zap,
  Plus,
  FileText,
  Mail,
  Phone,
  Upload,
  X,
  CheckCircle2
} from "lucide-react";

// Mock job listings data
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
  {
    id: 4,
    title: "Mobile App Developer",
    company: "AgriTech Philippines",
    companyLogo: "https://images.unsplash.com/photo-1516387938699-a93567ec168e?w=100&h=100&fit=crop",
    location: "Cebu, Philippines",
    type: "Full-time",
    salary: "₱70,000 - ₱100,000/month",
    postedBy: {
      name: "Juan dela Cruz",
      username: "juandc",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    },
    postedAt: "2 days ago",
    applicants: 15,
    description: "Looking for a React Native developer to build mobile apps for farmers. Experience with Firebase and Google Maps API preferred.",
    fullDescription: "AgriTech Philippines is on a mission to help Filipino farmers through technology. We're looking for a Mobile App Developer to join our team.\n\nResponsibilities:\n• Develop and maintain React Native applications\n• Integrate with Firebase and third-party APIs\n• Implement location-based features using Google Maps\n• Ensure app performance and responsiveness\n• Collaborate with designers and product team\n\nRequirements:\n• 2+ years of React Native experience\n• Experience with Firebase (Authentication, Firestore, Cloud Functions)\n• Knowledge of Google Maps API\n• Understanding of mobile app publishing process\n• Passion for agriculture and social impact\n\nWhat We Offer:\n• Competitive salary and benefits\n• Make a real impact on farmers' lives\n• Work with cutting-edge mobile technologies\n• Supportive and mission-driven team",
    tags: ["React Native", "Firebase", "Mobile", "iOS", "Android"],
    featured: false,
  },
  {
    id: 5,
    title: "Backend Engineer (Node.js)",
    company: "FinTech Solutions",
    companyLogo: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=100&h=100&fit=crop",
    location: "BGC, Taguig",
    type: "Full-time",
    salary: "₱90,000 - ₱130,000/month",
    postedBy: {
      name: "Sofia Garcia",
      username: "sofiag",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    },
    postedAt: "3 days ago",
    applicants: 28,
    description: "Seeking a backend engineer to work on our payment processing systems. Strong Node.js and database experience required.",
    fullDescription: "FinTech Solutions is looking for a Backend Engineer to help build secure and scalable payment processing systems.\n\nResponsibilities:\n• Design and implement RESTful APIs\n• Build microservices architecture\n• Ensure system security and data protection\n• Optimize database queries and performance\n• Monitor and troubleshoot production systems\n\nRequirements:\n• 4+ years of backend development experience\n• Expert knowledge of Node.js and Express\n• Strong database skills (PostgreSQL, MongoDB)\n• Experience with microservices and AWS\n• Understanding of security best practices\n• Experience with payment systems is a plus\n\nWhat We Offer:\n• Excellent compensation package\n• Stock options\n• Health and wellness benefits\n• Continuous learning opportunities\n• Modern office in BGC",
    tags: ["Node.js", "PostgreSQL", "Express", "Microservices", "AWS"],
    featured: false,
  },
  {
    id: 6,
    title: "DevOps Engineer",
    company: "Cloud Infrastructure Co",
    companyLogo: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=100&h=100&fit=crop",
    location: "Remote (Philippines)",
    type: "Full-time",
    salary: "₱100,000 - ₱150,000/month",
    postedBy: {
      name: "Miguel Ramos",
      username: "miguelr",
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    },
    postedAt: "4 days ago",
    applicants: 12,
    description: "Join our DevOps team to manage cloud infrastructure and CI/CD pipelines. Experience with AWS and Docker required.",
    fullDescription: "Cloud Infrastructure Co is seeking a DevOps Engineer to help us build and maintain world-class cloud infrastructure.\n\nResponsibilities:\n• Manage and optimize AWS infrastructure\n• Build and maintain CI/CD pipelines\n• Implement infrastructure as code using Terraform\n• Monitor system performance and reliability\n• Automate deployment processes\n• Ensure security and compliance\n\nRequirements:\n• 3+ years of DevOps experience\n• Strong knowledge of AWS services\n• Experience with Docker and Kubernetes\n• Proficiency in scripting (Bash, Python)\n• Understanding of networking and security\n• Experience with monitoring tools (Datadog, New Relic)\n\nWhat We Offer:\n• Top-tier salary\n• 100% remote work\n• Latest DevOps tools and technologies\n• Global team collaboration\n• Professional certification support",
    tags: ["DevOps", "AWS", "Docker", "Kubernetes", "CI/CD"],
    featured: true,
  },
];

// Quick filters
const quickFilters = [
  { label: "All Jobs", value: "all", icon: Briefcase },
  { label: "Full-time", value: "full-time", icon: Clock },
  { label: "Remote", value: "remote", icon: Zap },
  { label: "Featured", value: "featured", icon: TrendingUp },
];

export function Jobs() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [savedJobs, setSavedJobs] = useState<number[]>([]);
  
  // Dialogs state
  const [isPostJobOpen, setIsPostJobOpen] = useState(false);
  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  
  // Post job form state
  const [jobType, setJobType] = useState("");

  const handleSaveJob = (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    if (savedJobs.includes(jobId)) {
      setSavedJobs(savedJobs.filter(id => id !== jobId));
    } else {
      setSavedJobs([...savedJobs, jobId]);
    }
  };

  const handleViewDetails = (e: React.MouseEvent, jobId: number) => {
    e.stopPropagation();
    navigate(`/jobs/${jobId}`);
  };

  const handleApplyNow = (e: React.MouseEvent, job: any) => {
    e.stopPropagation();
    setSelectedJob(job);
    setIsApplyOpen(true);
    setApplicationSubmitted(false);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    setApplicationSubmitted(true);
    setTimeout(() => {
      setIsApplyOpen(false);
      setApplicationSubmitted(false);
    }, 2000);
  };

  const handlePostJob = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would submit to an API
    setIsPostJobOpen(false);
  };

  const filteredJobs = mockJobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (activeFilter === "all") return matchesSearch;
    if (activeFilter === "full-time") return matchesSearch && job.type === "Full-time";
    if (activeFilter === "remote") return matchesSearch && job.tags.includes("Remote OK");
    if (activeFilter === "featured") return matchesSearch && job.featured;
    
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Hire or Get Hired</h1>
              <p className="text-muted-foreground">
                Find your next opportunity or discover talented developers
              </p>
            </div>
            <Button className="gap-2" onClick={() => setIsPostJobOpen(true)}>
              <Plus className="w-4 h-4" strokeWidth={2} />
              Post a Job
            </Button>
          </div>

          {/* Search Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={2} />
              <Input
                placeholder="Search jobs, companies, or skills..."
                className="pl-10 h-11"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 h-11">
              <Filter className="w-4 h-4" strokeWidth={2} />
              Filters
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex gap-2 mt-4">
            {quickFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.value}
                  variant={activeFilter === filter.value ? "default" : "outline"}
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveFilter(filter.value)}
                >
                  <Icon className="w-4 h-4" strokeWidth={2} />
                  {filter.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Stats Bar */}
        <Card className="mb-6 border">
          <CardContent className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{mockJobs.length}</div>
                <p className="text-xs text-muted-foreground">Active Jobs</p>
              </div>
              <div className="border-l border-r">
                <div className="text-2xl font-bold text-primary">
                  {mockJobs.reduce((sum, job) => sum + job.applicants, 0)}
                </div>
                <p className="text-xs text-muted-foreground">Total Applicants</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">
                  {mockJobs.filter(job => job.featured).length}
                </div>
                <p className="text-xs text-muted-foreground">Featured Jobs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Listings */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJobs.length === 0 ? (
            <Card className="border col-span-full">
              <CardContent className="p-12 text-center">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground" strokeWidth={2} />
                <h3 className="font-semibold mb-2">No jobs found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <Card 
                key={job.id} 
                className={`border transition-all hover:shadow-lg cursor-pointer flex flex-col ${
                  job.featured ? "border-primary/30 bg-primary/5" : ""
                }`}
              >
                <CardContent className="p-4 flex flex-col flex-1">
                  {/* Company Logo & Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="w-12 h-12 rounded-lg border-2 border-border object-cover"
                    />
                    {job.featured && (
                      <Badge variant="default" className="gap-1">
                        <TrendingUp className="w-3 h-3" strokeWidth={2} />
                        Featured
                      </Badge>
                    )}
                  </div>

                  {/* Job Title & Company */}
                  <div className="mb-3">
                    <h3 className="font-bold text-base mb-1 line-clamp-2">{job.title}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" strokeWidth={2} />
                      {job.company}
                    </p>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
                    {job.description}
                  </p>

                  {/* Job Meta */}
                  <div className="space-y-2 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" strokeWidth={2} />
                      {job.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" strokeWidth={2} />
                      {job.type}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" strokeWidth={2} />
                      {job.salary}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {job.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {job.tags.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{job.tags.length - 3}
                      </Badge>
                    )}
                  </div>

                  <Separator className="mb-3" />

                  {/* Footer - Pushed to bottom */}
                  <div className="mt-auto space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={job.postedBy.avatar} />
                          <AvatarFallback>{job.postedBy.name[0]}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">@{job.postedBy.username}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" strokeWidth={2} />
                        {job.applicants}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 text-xs h-8"
                        onClick={(e) => handleViewDetails(e, job.id)}
                      >
                        Details
                      </Button>
                      <Button 
                        size="sm"
                        className="flex-1 text-xs h-8"
                        onClick={(e) => handleApplyNow(e, job)}
                      >
                        Apply
                      </Button>
                      <Button
                        variant={savedJobs.includes(job.id) ? "default" : "outline"}
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={(e) => handleSaveJob(e, job.id)}
                      >
                        {savedJobs.includes(job.id) ? (
                          <Bookmark className="w-4 h-4" strokeWidth={2} fill="currentColor" />
                        ) : (
                          <BookmarkPlus className="w-4 h-4" strokeWidth={2} />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Load More */}
        {filteredJobs.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg">
              Load More Jobs
            </Button>
          </div>
        )}
      </div>

      {/* Apply Now Dialog */}
      <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
        <DialogContent className="max-w-2xl">
          {selectedJob && !applicationSubmitted && (
            <>
              <DialogHeader>
                <DialogTitle>Apply for {selectedJob.title}</DialogTitle>
                <DialogDescription>
                  at {selectedJob.company}
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

      {/* Post Job Dialog */}
      <Dialog open={isPostJobOpen} onOpenChange={setIsPostJobOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post a Job</DialogTitle>
            <DialogDescription>
              Fill in the details to post a new job listing
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handlePostJob} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input id="jobTitle" placeholder="e.g. Senior Full Stack Developer" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company Name *</Label>
              <Input id="company" placeholder="Your Company Name" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location *</Label>
                <Input id="location" placeholder="e.g. Manila, Philippines" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type *</Label>
                <Select value={jobType} onValueChange={setJobType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full-time">Full-time</SelectItem>
                    <SelectItem value="part-time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="freelance">Freelance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Salary Range *</Label>
              <Input id="salary" placeholder="e.g. ₱80,000 - ₱120,000/month" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short Description *</Label>
              <Textarea 
                id="shortDesc" 
                placeholder="Brief overview of the position (1-2 sentences)"
                rows={2}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullDesc">Full Job Description *</Label>
              <Textarea 
                id="fullDesc" 
                placeholder="Detailed job description including responsibilities, requirements, and benefits..."
                rows={8}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Skills/Tags (comma-separated) *</Label>
              <Input id="tags" placeholder="e.g. React, Node.js, TypeScript, PostgreSQL" required />
              <p className="text-xs text-muted-foreground">Separate skills with commas</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applyEmail">Application Email *</Label>
              <Input id="applyEmail" type="email" placeholder="careers@yourcompany.com" required />
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="featured" className="w-4 h-4" />
              <Label htmlFor="featured" className="cursor-pointer">
                Make this a featured job listing (+₱500)
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPostJobOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                Post Job
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}