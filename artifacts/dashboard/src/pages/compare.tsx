import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockProducts, mockFeatures } from "@/lib/mock-data";

export default function ComparePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compare Products</h1>
          <p className="text-muted-foreground">Compare features and sentiment across multiple products.</p>
        </div>
        <div className="flex gap-2">
           <Select defaultValue="1">
             <SelectTrigger className="w-[150px]">
               <SelectValue placeholder="Product 1" />
             </SelectTrigger>
             <SelectContent>
               {mockProducts.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
             </SelectContent>
           </Select>
           <Select>
             <SelectTrigger className="w-[150px]">
               <SelectValue placeholder="Product 2" />
             </SelectTrigger>
             <SelectContent>
               {mockProducts.map(p => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}
             </SelectContent>
           </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparison Matrix</CardTitle>
          <CardDescription>Negative sentiment % per feature</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Product 1</TableHead>
                <TableHead>Product 2</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockFeatures.map(f => (
                <TableRow key={f.feature}>
                  <TableCell className="font-medium">{f.feature}</TableCell>
                  <TableCell className="text-rose-500">{f.negative_pct}%</TableCell>
                  <TableCell className="text-muted-foreground">-</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
