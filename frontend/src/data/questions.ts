export type Question = {
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export const quizQuestions: Question[] = [
  {
    prompt: "Which data structure offers O(1) average-time lookups by key?",
    options: ["Linked list", "Hash map", "Binary heap", "Queue"],
    answer: 1,
    explanation: "Hash maps hash the key to a bucket, giving constant average lookup time.",
  },
  {
    prompt: "In economics, what does 'opportunity cost' describe?",
    options: [
      "The cash paid for a good",
      "The value of the next best alternative foregone",
      "Total production cost",
      "The tax on a transaction",
    ],
    answer: 1,
    explanation:
      "Opportunity cost is the benefit you give up by not choosing the next best option.",
  },
  {
    prompt: "Which planet has the shortest day in the Solar System?",
    options: ["Mercury", "Earth", "Jupiter", "Mars"],
    answer: 2,
    explanation: "Jupiter rotates once every ~9 hours 56 minutes despite being the largest planet.",
  },
  {
    prompt: "What is the derivative of ln(x)?",
    options: ["x", "1/x", "e^x", "ln(x)/x"],
    answer: 1,
    explanation: "The natural logarithm differentiates to 1/x for x > 0.",
  },
  {
    prompt: "Which protocol secures data in transit on the modern web?",
    options: ["FTP", "TLS", "SMTP", "ARP"],
    answer: 1,
    explanation: "TLS encrypts the channel between client and server - the S in HTTPS.",
  },
  {
    prompt: "The mitochondrion is primarily responsible for…",
    options: ["Protein folding", "ATP production", "DNA replication", "Waste disposal"],
    answer: 1,
    explanation: "Mitochondria generate ATP through oxidative phosphorylation.",
  },
  {
    prompt: "In project management, what does a critical path represent?",
    options: [
      "The cheapest sequence of tasks",
      "The longest sequence of dependent tasks",
      "Tasks assigned to senior staff",
      "Optional tasks",
    ],
    answer: 1,
    explanation: "The critical path is the longest dependent chain - it sets the minimum duration.",
  },
  {
    prompt: "Which literary device is 'the wind whispered through the trees'?",
    options: ["Personification", "Hyperbole", "Metonymy", "Oxymoron"],
    answer: 0,
    explanation: "Human qualities given to a non-human subject is personification.",
  },
  {
    prompt: "What does a p-value below 0.05 conventionally indicate?",
    options: [
      "The hypothesis is proven",
      "Results are statistically significant at the 5% level",
      "The sample was too small",
      "There is no effect",
    ],
    answer: 1,
    explanation:
      "It means results this extreme would occur under the null less than 5% of the time.",
  },
  {
    prompt: "Which term describes learning content delivered in short focused units?",
    options: ["Blended learning", "Microlearning", "Flipped classroom", "Andragogy"],
    answer: 1,
    explanation: "Microlearning breaks material into small, targeted, easily retained units.",
  },
];
