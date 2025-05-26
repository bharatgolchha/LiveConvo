"use client"

import * as React from "react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertCircle, CheckCircle, Info, Menu, Settings, User, Heart, Star, Download, Share, Eye } from "lucide-react"

export default function DemoPage() {
  const [count, setCount] = React.useState(0)
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    message: ""
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 py-8">
          <h1 className="text-4xl font-bold text-slate-900">ShadCN/UI Components Demo</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            A comprehensive showcase of beautifully designed components built with Radix UI and Tailwind CSS
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="default">React</Badge>
            <Badge variant="secondary">TypeScript</Badge>
            <Badge variant="outline">Tailwind CSS</Badge>
            <Badge variant="destructive">ShadCN/UI</Badge>
          </div>
        </div>

        {/* Alert Examples */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Display important messages and notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Info</AlertTitle>
              <AlertDescription>
                This is an informational alert. Use it to provide helpful context.
              </AlertDescription>
            </Alert>
            
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Something went wrong. Please check your input and try again.
              </AlertDescription>
            </Alert>

            <Alert className="border-green-200 bg-green-50 text-green-800">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>
                Your changes have been saved successfully!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button styles and sizes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div>
                <h3 className="font-semibold mb-3">Variants</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="link">Link</Button>
                  <Button variant="destructive">Destructive</Button>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Sizes</h3>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm">Small</Button>
                  <Button size="default">Default</Button>
                  <Button size="lg">Large</Button>
                  <Button size="icon"><Heart className="h-4 w-4" /></Button>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">With Icons</h3>
                <div className="flex flex-wrap gap-2">
                  <Button><Download className="mr-2 h-4 w-4" />Download</Button>
                  <Button variant="outline"><Share className="mr-2 h-4 w-4" />Share</Button>
                  <Button variant="secondary"><Eye className="mr-2 h-4 w-4" />View</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Forms */}
        <Card>
          <CardHeader>
            <CardTitle>Form Elements</CardTitle>
            <CardDescription>Inputs, labels, and form controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>

                <div>
                  <Label htmlFor="select">Select an option</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="option1">Option 1</SelectItem>
                      <SelectItem value="option2">Option 2</SelectItem>
                      <SelectItem value="option3">Option 3</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea 
                  id="message"
                  placeholder="Enter your message here..."
                  className="min-h-[120px]"
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                />
              </div>
            </div>
            
            <Button className="w-full">Submit Form</Button>
          </CardContent>
        </Card>

        {/* Interactive Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Counter Card */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Counter</CardTitle>
              <CardDescription>Click the buttons to change the count</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{count}</div>
                <p className="text-muted-foreground">Current count</p>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setCount(count - 1)}>
                  -
                </Button>
                <Button onClick={() => setCount(0)}>
                  Reset
                </Button>
                <Button variant="outline" onClick={() => setCount(count + 1)}>
                  +
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Badges Card */}
          <Card>
            <CardHeader>
              <CardTitle>Badges</CardTitle>
              <CardDescription>Various badge styles and colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Status Badges</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Active</Badge>
                    <Badge variant="secondary">Pending</Badge>
                    <Badge variant="outline">Draft</Badge>
                    <Badge variant="destructive">Cancelled</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Custom Badges</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-green-100 text-green-800">Success</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800">Warning</Badge>
                    <Badge className="bg-blue-100 text-blue-800">Info</Badge>
                    <Badge className="bg-purple-100 text-purple-800">New</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Example */}
        <Card>
          <CardHeader>
            <CardTitle>Tabs</CardTitle>
            <CardDescription>Organize content into switchable panels</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <h3 className="text-lg font-semibold">Overview</h3>
                <p className="text-muted-foreground">
                  This is the overview tab. Here you can see a summary of your data and key metrics.
                  The content is organized in a clean, accessible way.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-600">42</div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-600">98%</div>
                    <div className="text-sm text-muted-foreground">Uptime</div>
                  </div>
                  <div className="p-4 border rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-600">1.2k</div>
                    <div className="text-sm text-muted-foreground">Page Views</div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="analytics" className="space-y-4">
                <h3 className="text-lg font-semibold">Analytics</h3>
                <p className="text-muted-foreground">
                  Detailed analytics and performance metrics would be displayed here.
                  Charts, graphs, and detailed breakdowns help understand the data.
                </p>
                <div className="h-32 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Chart placeholder</p>
                </div>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <h3 className="text-lg font-semibold">Settings</h3>
                <p className="text-muted-foreground">
                  Configure your preferences and account settings here.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notifications">Enable notifications</Label>
                    <Button variant="outline" size="sm">Toggle</Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="darkmode">Dark mode</Label>
                    <Button variant="outline" size="sm">Toggle</Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dialogs and Sheets */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dialog Example</CardTitle>
              <CardDescription>Modal dialogs for important actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">Open Dialog</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Confirm Action</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to proceed? This action cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <p className="text-sm text-muted-foreground">
                      This is where you would put additional content or form elements
                      that need user interaction before confirming.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline">Cancel</Button>
                    <Button>Confirm</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sheet Example</CardTitle>
              <CardDescription>Slide-out panels for additional content</CardDescription>
            </CardHeader>
            <CardContent>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <Menu className="mr-2 h-4 w-4" />
                    Open Sheet
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Settings Panel</SheetTitle>
                    <SheetDescription>
                      Configure your application settings from this panel.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-6 space-y-4">
                    <div>
                      <Label htmlFor="username">Username</Label>
                      <Input id="username" placeholder="Enter username" />
                    </div>
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea id="bio" placeholder="Tell us about yourself" />
                    </div>
                    <Button className="w-full">Save Changes</Button>
                  </div>
                </SheetContent>
              </Sheet>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold">ShadCN/UI Integration Complete! 🎉</h3>
              <p className="text-muted-foreground">
                All components are working and styled consistently. Ready for your application!
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <Button variant="outline" size="sm">
                  <Star className="mr-2 h-4 w-4" />
                  Star on GitHub
                </Button>
                <Button variant="outline" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  Documentation
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 