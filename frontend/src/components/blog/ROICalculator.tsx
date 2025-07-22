'use client'

import { useState, useEffect } from 'react'

export default function ROICalculator() {
  const [numReps, setNumReps] = useState(5)
  const [avgSalary, setAvgSalary] = useState(90000)
  const [hoursReclaimed, setHoursReclaimed] = useState(14)
  const [closeRate, setCloseRate] = useState(20)
  const [avgDealSize, setAvgDealSize] = useState(50000)
  
  const [results, setResults] = useState({
    timeSaved: 0,
    costSavings: 0,
    revenueImpact: 0,
    totalImpact: 0
  })
  
  useEffect(() => {
    // Calculate hourly rate (assuming 2080 working hours per year)
    const hourlyRate = avgSalary / 2080
    
    // Monthly hours saved (hours per week * 4 weeks * number of reps)
    const monthlyHoursSaved = numReps * hoursReclaimed * 4
    
    // Annual cost savings (monthly hours * hourly rate * 12 months)
    const annualSavings = monthlyHoursSaved * hourlyRate * 12
    
    // Additional sales activity calculations
    // Assume each hour saved = 2 additional calls
    const additionalCallsPerMonth = hoursReclaimed * 2 * 4 // per rep per month
    const totalAdditionalCalls = additionalCallsPerMonth * numReps * 12 // annual
    
    // Calculate additional deals (assuming 10 calls per deal on average)
    const additionalDeals = (totalAdditionalCalls * (closeRate / 100)) / 10
    
    // Additional revenue from those deals
    const additionalRevenue = additionalDeals * avgDealSize
    
    setResults({
      timeSaved: monthlyHoursSaved,
      costSavings: Math.round(annualSavings),
      revenueImpact: Math.round(additionalRevenue),
      totalImpact: Math.round(annualSavings + additionalRevenue)
    })
  }, [numReps, avgSalary, hoursReclaimed, closeRate, avgDealSize])
  
  return (
    <div className="my-8 p-6 bg-muted/50 rounded-lg border border-border">
      <h3 className="text-xl font-semibold mb-4">ROI Calculator</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Number of Sales Reps</label>
          <input 
            type="number" 
            value={numReps}
            onChange={(e) => setNumReps(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Average Rep Salary (Fully Loaded)</label>
          <input 
            type="number" 
            value={avgSalary}
            onChange={(e) => setAvgSalary(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Hours Reclaimed per Week per Rep</label>
          <input 
            type="number" 
            value={hoursReclaimed}
            onChange={(e) => setHoursReclaimed(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Current Close Rate (%)</label>
          <input 
            type="number" 
            value={closeRate}
            onChange={(e) => setCloseRate(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background" 
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2">Average Deal Size ($)</label>
          <input 
            type="number" 
            value={avgDealSize}
            onChange={(e) => setAvgDealSize(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background" 
          />
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-border">
        <h4 className="font-semibold mb-4">Your Annual Impact with LivePrompt.ai:</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Hours Saved per Month</p>
            <p className="text-2xl font-bold text-primary">{results.timeSaved.toLocaleString()}</p>
          </div>
          <div className="bg-background p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Cost Savings</p>
            <p className="text-2xl font-bold text-primary">${results.costSavings.toLocaleString()}</p>
          </div>
          <div className="bg-background p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Additional Revenue</p>
            <p className="text-2xl font-bold text-primary">${results.revenueImpact.toLocaleString()}</p>
          </div>
          <div className="bg-background p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Annual Impact</p>
            <p className="text-2xl font-bold text-app-success">${results.totalImpact.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-center">
            <strong>ROI: {((results.totalImpact / (avgSalary * numReps)) * 100).toFixed(0)}%</strong> return on your sales team investment
          </p>
        </div>
      </div>
    </div>
  )
}