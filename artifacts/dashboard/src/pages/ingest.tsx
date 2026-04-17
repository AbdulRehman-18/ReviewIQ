import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";

export default function IngestPage() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Data Ingestion</h1>
        <p className="text-muted-foreground">Upload or paste customer reviews for analysis.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ingest Reviews</CardTitle>
          <CardDescription>Choose how you want to provide review data.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload">
            <TabsList className="mb-4">
              <TabsTrigger value="upload">Upload File</TabsTrigger>
              <TabsTrigger value="paste">Paste Reviews</TabsTrigger>
              <TabsTrigger value="simulated">Simulated Feed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <div className="border-2 border-dashed border-border rounded-lg p-12 flex flex-col items-center justify-center text-center">
                <Upload className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-1">Click to upload or drag and drop</h3>
                <p className="text-sm text-muted-foreground mb-4">CSV or JSON format (max 50MB)</p>
                <Button>Select File</Button>
              </div>
            </TabsContent>
            
            <TabsContent value="paste">
              <div className="space-y-4">
                <Textarea placeholder="Paste your reviews here (one per line)..." className="min-h-[200px]" />
                <Button>Analyze Reviews</Button>
              </div>
            </TabsContent>

            <TabsContent value="simulated">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Start a simulated feed to see real-time analysis updates.</p>
                <Button variant="secondary">Start Simulated Feed</Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
