"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const ingredient_normalizer_1 = require("../utils/ingredient-normalizer");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(dynamoClient);
class TestSingleTableImporter {
    constructor() {
        this.RECIPES_TABLE = process.env.RECIPES_TABLE || 'recipe-matcher-recipes-v2';
        this.SYSTEM_USER_ID = 'SYSTEM';
    }
    async testImport() {
        console.log('🧪 Testing Single-Table Import with Mock Data...\n');
        try {
            // Create test recipes
            const testRecipes = this.createTestRecipes();
            console.log(`📝 Created ${testRecipes.length} test recipes`);
            // Process each recipe
            for (let i = 0; i < testRecipes.length; i++) {
                const recipe = testRecipes[i];
                console.log(`\n📝 Processing recipe ${i + 1}/${testRecipes.length}: ${recipe.title}`);
                try {
                    await this.saveRecipeV2(recipe);
                    console.log(`✅ Successfully saved: ${recipe.title}`);
                }
                catch (error) {
                    console.error(`❌ Error saving recipe ${recipe.title}:`, error);
                }
            }
            console.log('\n🎉 Test import completed successfully!');
        }
        catch (error) {
            console.error('💥 Test import failed:', error);
            throw error;
        }
    }
    createTestRecipes() {
        return [
            {
                recipeId: 'test-recipe-1',
                userId: this.SYSTEM_USER_ID,
                title: 'Chicken Stir Fry',
                description: 'Quick and easy chicken stir fry with vegetables',
                ingredients: [
                    { name: 'Chicken Breast', quantity: '300', unit: 'gram' },
                    { name: 'Bell Peppers', quantity: '2', unit: 'piece' },
                    { name: 'Broccoli', quantity: '200', unit: 'gram' },
                    { name: 'Garlic', quantity: '3', unit: 'clove' },
                    { name: 'Soy Sauce', quantity: '30', unit: 'milliliter' },
                    { name: 'Olive Oil', quantity: '15', unit: 'milliliter' }
                ],
                instructions: [
                    'Cut chicken into thin strips',
                    'Heat oil in a wok or large pan',
                    'Stir fry chicken until golden brown',
                    'Add vegetables and stir fry for 3-4 minutes',
                    'Add soy sauce and toss everything together',
                    'Serve hot over rice'
                ],
                cookingTime: 20,
                difficultyLevel: 'easy',
                servings: 4,
                dietaryTags: ['dinner', 'asian', 'non-vegetarian', 'quick'],
                imageUrl: 'https://images.unsplash.com/photo-1609501676725-7186f0a0d0e1?w=500',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'Test Data',
                nutrition: {
                    calories: 350,
                    protein: 28,
                    carbs: 12,
                    fat: 18
                }
            },
            {
                recipeId: 'test-recipe-2',
                userId: this.SYSTEM_USER_ID,
                title: 'Vegetarian Pasta',
                description: 'Creamy vegetarian pasta with fresh vegetables',
                ingredients: [
                    { name: 'Pasta', quantity: '400', unit: 'gram' },
                    { name: 'Cherry Tomatoes', quantity: '200', unit: 'gram' },
                    { name: 'Fresh Basil', quantity: '20', unit: 'gram' },
                    { name: 'Garlic', quantity: '2', unit: 'clove' },
                    { name: 'Olive Oil', quantity: '30', unit: 'milliliter' },
                    { name: 'Parmesan Cheese', quantity: '50', unit: 'gram' }
                ],
                instructions: [
                    'Cook pasta according to package instructions',
                    'Heat olive oil in a large pan',
                    'Add garlic and cook until fragrant',
                    'Add cherry tomatoes and cook until they burst',
                    'Toss with cooked pasta and fresh basil',
                    'Serve with grated parmesan cheese'
                ],
                cookingTime: 25,
                difficultyLevel: 'easy',
                servings: 4,
                dietaryTags: ['dinner', 'italian', 'vegetarian', 'pasta'],
                imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3dbc353d2e5?w=500',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                source: 'Test Data',
                nutrition: {
                    calories: 420,
                    protein: 15,
                    carbs: 65,
                    fat: 12
                }
            }
        ];
    }
    async saveRecipeV2(recipe) {
        // Create all the items for single-table design
        const items = this.createSingleTableItems(recipe);
        console.log(`📦 Created ${items.length} items for recipe: ${recipe.title}`);
        // Log the structure for verification
        console.log('📋 Item types:');
        const itemTypes = items.reduce((acc, item) => {
            acc[item.entity_type] = (acc[item.entity_type] || 0) + 1;
            return acc;
        }, {});
        console.log(itemTypes);
        // Save all items using batch write
        await this.batchWriteItems(items);
    }
    createSingleTableItems(recipe) {
        const items = [];
        const now = new Date().toISOString();
        // 1. Main Recipe Entity
        const recipeEntity = {
            PK: `RECIPE#${recipe.recipeId}`,
            SK: `RECIPE#${recipe.recipeId}`,
            entity_type: 'recipe',
            title: recipe.title,
            description: recipe.description,
            author_id: `USER#${recipe.userId}`,
            created_at: recipe.createdAt,
            updated_at: recipe.updatedAt,
            cooking_time: recipe.cookingTime,
            difficulty_level: recipe.difficultyLevel,
            servings: recipe.servings,
            image_url: recipe.imageUrl,
            source: recipe.source,
            source_url: recipe.sourceUrl,
            rating: recipe.rating,
            review_count: recipe.reviewCount,
            nutrition: recipe.nutrition,
            // GSI projections
            GSI1PK: `AUTHOR#${recipe.userId}`,
            GSI1SK: recipe.createdAt
        };
        items.push(recipeEntity);
        // 2. Ingredient Entities (one per ingredient with normalization)
        for (const ingredient of recipe.ingredients) {
            const normalized = (0, ingredient_normalizer_1.createNormalizedIngredient)(ingredient.name);
            console.log(`  🥕 Ingredient: "${ingredient.name}" → "${normalized.normalized}"`);
            console.log(`     Variations: [${normalized.variations.join(', ')}]`);
            // Create main ingredient entity
            const ingredientEntity = {
                PK: `RECIPE#${recipe.recipeId}`,
                SK: `INGREDIENT#${normalized.normalized}`,
                entity_type: 'ingredient',
                name: ingredient.name,
                normalized_name: normalized.normalized,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                // GSI3 projection
                GSI3PK: `INGREDIENT#${normalized.normalized}`,
                GSI3SK: `RECIPE#${recipe.recipeId}`
            };
            items.push(ingredientEntity);
            // Create variation entities for better matching
            for (const variation of normalized.variations) {
                if (variation !== normalized.normalized) {
                    const variationEntity = {
                        PK: `RECIPE#${recipe.recipeId}`,
                        SK: `INGREDIENT#${variation}`,
                        entity_type: 'ingredient_variation',
                        name: ingredient.name,
                        normalized_name: normalized.normalized,
                        variation: variation,
                        quantity: ingredient.quantity,
                        unit: ingredient.unit,
                        // GSI3 projection
                        GSI3PK: `INGREDIENT#${variation}`,
                        GSI3SK: `RECIPE#${recipe.recipeId}`
                    };
                    items.push(variationEntity);
                }
            }
        }
        // 3. Step Entities (one per instruction)
        for (let i = 0; i < recipe.instructions.length; i++) {
            const stepEntity = {
                PK: `RECIPE#${recipe.recipeId}`,
                SK: `STEP#${i + 1}`,
                entity_type: 'step',
                order: i + 1,
                instruction: recipe.instructions[i]
            };
            items.push(stepEntity);
        }
        // 4. Tag Entities (one per dietary tag)
        for (const tag of recipe.dietaryTags) {
            const tagEntity = {
                PK: `RECIPE#${recipe.recipeId}`,
                SK: `TAG#${tag}`,
                entity_type: 'tag',
                tag: tag,
                // GSI2 projection
                GSI2PK: `TAG#${tag}`,
                GSI2SK: `RECIPE#${recipe.recipeId}`
            };
            items.push(tagEntity);
        }
        return items;
    }
    async batchWriteItems(items) {
        // DynamoDB batch write can handle up to 25 items per request
        const batchSize = 25;
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const requestItems = {
                [this.RECIPES_TABLE]: batch.map(item => ({
                    PutRequest: { Item: item }
                }))
            };
            try {
                await docClient.send(new lib_dynamodb_1.BatchWriteCommand({
                    RequestItems: requestItems
                }));
                console.log(`✅ Saved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`);
            }
            catch (error) {
                console.error(`❌ Error saving batch:`, error);
                throw error;
            }
        }
    }
}
// Run the test importer if this file is executed directly
if (require.main === module) {
    const importer = new TestSingleTableImporter();
    importer.testImport()
        .then(() => {
        console.log('🎉 Test import completed successfully!');
        process.exit(0);
    })
        .catch((error) => {
        console.error('💥 Test import failed:', error);
        process.exit(1);
    });
}
exports.default = TestSingleTableImporter;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC1zaW5nbGUtdGFibGUtaW1wb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LXNpbmdsZS10YWJsZS1pbXBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDhEQUEwRDtBQUMxRCx3REFBa0Y7QUFDbEYsMEVBQTRFO0FBRTVFLE1BQU0sWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7QUFnQzVELE1BQU0sdUJBQXVCO0lBQTdCO1FBQ21CLGtCQUFhLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksMkJBQTJCLENBQUM7UUFDekUsbUJBQWMsR0FBRyxRQUFRLENBQUM7SUE0UDdDLENBQUM7SUExUEMsS0FBSyxDQUFDLFVBQVU7UUFDZCxPQUFPLENBQUMsR0FBRyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7UUFFbEUsSUFBSSxDQUFDO1lBQ0gsc0JBQXNCO1lBQ3RCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1lBRTdDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxXQUFXLENBQUMsTUFBTSxlQUFlLENBQUMsQ0FBQztZQUU3RCxzQkFBc0I7WUFDdEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDNUMsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7Z0JBRXRGLElBQUksQ0FBQztvQkFDSCxNQUFNLElBQUksQ0FBQyxZQUFZ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a0JBQWUsdUJBQXVCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBCYXRjaFdyaXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBjcmVhdGVOb3JtYWxpemVkSW5ncmVkaWVudCB9IGZyb20gJy4uL3V0aWxzL2luZ3JlZGllbnQtbm9ybWFsaXplcic7XG5cbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oZHluYW1vQ2xpZW50KTtcblxuaW50ZXJmYWNlIFJlY2lwZSB7XG4gIHJlY2lwZUlkOiBzdHJpbmc7XG4gIHVzZXJJZDogc3RyaW5nO1xuICB0aXRsZTogc3RyaW5nO1xuICBkZXNjcmlwdGlvbjogc3RyaW5nO1xuICBpbmdyZWRpZW50czoge1xuICAgIG5hbWU6IHN0cmluZztcbiAgICBxdWFudGl0eTogc3RyaW5nO1xuICAgIHVuaXQ6IHN0cmluZztcbiAgfVtdO1xuICBpbnN0cnVjdGlvbnM6IHN0cmluZ1tdO1xuICBjb29raW5nVGltZTogbnVtYmVyO1xuICBkaWZmaWN1bHR5TGV2ZWw6ICdlYXN5JyB8ICdtZWRpdW0nIHwgJ2hhcmQnO1xuICBzZXJ2aW5nczogbnVtYmVyO1xuICBkaWV0YXJ5VGFnczogc3RyaW5nW107XG4gIGltYWdlVXJsPzogc3RyaW5nO1xuICBjcmVhdGVkQXQ6IHN0cmluZztcbiAgdXBkYXRlZEF0OiBzdHJpbmc7XG4gIHJhdGluZz86IG51bWJlcjtcbiAgcmV2aWV3Q291bnQ/OiBudW1iZXI7XG4gIHNvdXJjZT86IHN0cmluZztcbiAgc291cmNlVXJsPzogc3RyaW5nO1xuICBudXRyaXRpb24/OiB7XG4gICAgY2Fsb3JpZXM/OiBudW1iZXI7XG4gICAgcHJvdGVpbj86IG51bWJlcjtcbiAgICBjYXJicz86IG51bWJlcjtcbiAgICBmYXQ/OiBudW1iZXI7XG4gIH07XG59XG5cbmNsYXNzIFRlc3RTaW5nbGVUYWJsZUltcG9ydGVyIHtcbiAgcHJpdmF0ZSByZWFkb25seSBSRUNJUEVTX1RBQkxFID0gcHJvY2Vzcy5lbnYuUkVDSVBFU19UQUJMRSB8fCAncmVjaXBlLW1hdGNoZXItcmVjaXBlcy12Mic7XG4gIHByaXZhdGUgcmVhZG9ubHkgU1lTVEVNX1VTRVJfSUQgPSAnU1lTVEVNJztcblxuICBhc3luYyB0ZXN0SW1wb3J0KCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGNvbnNvbGUubG9nKCfwn6eqIFRlc3RpbmcgU2luZ2xlLVRhYmxlIEltcG9ydCB3aXRoIE1vY2sgRGF0YS4uLlxcbicpO1xuICAgIFxuICAgIHRyeSB7XG4gICAgICAvLyBDcmVhdGUgdGVzdCByZWNpcGVzXG4gICAgICBjb25zdCB0ZXN0UmVjaXBlcyA9IHRoaXMuY3JlYXRlVGVzdFJlY2lwZXMoKTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coYPCfk50gQ3JlYXRlZCAke3Rlc3RSZWNpcGVzLmxlbmd0aH0gdGVzdCByZWNpcGVzYCk7XG4gICAgICBcbiAgICAgIC8vIFByb2Nlc3MgZWFjaCByZWNpcGVcbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGVzdFJlY2lwZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgY29uc3QgcmVjaXBlID0gdGVzdFJlY2lwZXNbaV07XG4gICAgICAgIGNvbnNvbGUubG9nKGBcXG7wn5OdIFByb2Nlc3NpbmcgcmVjaXBlICR7aSArIDF9LyR7dGVzdFJlY2lwZXMubGVuZ3RofTogJHtyZWNpcGUudGl0bGV9YCk7XG4gICAgICAgIFxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IHRoaXMuc2F2ZVJlY2lwZVYyKHJlY2lwZSk7XG4gICAgICAgICAgY29uc29sZS5sb2coYOKchSBTdWNjZXNzZnVsbHkgc2F2ZWQ6ICR7cmVjaXBlLnRpdGxlfWApO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYOKdjCBFcnJvciBzYXZpbmcgcmVjaXBlICR7cmVjaXBlLnRpdGxlfTpgLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coJ1xcbvCfjokgVGVzdCBpbXBvcnQgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKTtcbiAgICAgIFxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCfwn5KlIFRlc3QgaW1wb3J0IGZhaWxlZDonLCBlcnJvcik7XG4gICAgICB0aHJvdyBlcnJvcjtcbiAgICB9XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVRlc3RSZWNpcGVzKCk6IFJlY2lwZVtdIHtcbiAgICByZXR1cm4gW1xuICAgICAge1xuICAgICAgICByZWNpcGVJZDogJ3Rlc3QtcmVjaXBlLTEnLFxuICAgICAgICB1c2VySWQ6IHRoaXMuU1lTVEVNX1VTRVJfSUQsXG4gICAgICAgIHRpdGxlOiAnQ2hpY2tlbiBTdGlyIEZyeScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnUXVpY2sgYW5kIGVhc3kgY2hpY2tlbiBzdGlyIGZyeSB3aXRoIHZlZ2V0YWJsZXMnLFxuICAgICAgICBpbmdyZWRpZW50czogW1xuICAgICAgICAgIHsgbmFtZTogJ0NoaWNrZW4gQnJlYXN0JywgcXVhbnRpdHk6ICczMDAnLCB1bml0OiAnZ3JhbScgfSxcbiAgICAgICAgICB7IG5hbWU6ICdCZWxsIFBlcHBlcnMnLCBxdWFudGl0eTogJzInLCB1bml0OiAncGllY2UnIH0sXG4gICAgICAgICAgeyBuYW1lOiAnQnJvY2NvbGknLCBxdWFudGl0eTogJzIwMCcsIHVuaXQ6ICdncmFtJyB9LFxuICAgICAgICAgIHsgbmFtZTogJ0dhcmxpYycsIHF1YW50aXR5OiAnMycsIHVuaXQ6ICdjbG92ZScgfSxcbiAgICAgICAgICB7IG5hbWU6ICdTb3kgU2F1Y2UnLCBxdWFudGl0eTogJzMwJywgdW5pdDogJ21pbGxpbGl0ZXInIH0sXG4gICAgICAgICAgeyBuYW1lOiAnT2xpdmUgT2lsJywgcXVhbnRpdHk6ICcxNScsIHVuaXQ6ICdtaWxsaWxpdGVyJyB9XG4gICAgICAgIF0sXG4gICAgICAgIGluc3RydWN0aW9uczogW1xuICAgICAgICAgICdDdXQgY2hpY2tlbiBpbnRvIHRoaW4gc3RyaXBzJyxcbiAgICAgICAgICAnSGVhdCBvaWwgaW4gYSB3b2sgb3IgbGFyZ2UgcGFuJyxcbiAgICAgICAgICAnU3RpciBmcnkgY2hpY2tlbiB1bnRpbCBnb2xkZW4gYnJvd24nLFxuICAgICAgICAgICdBZGQgdmVnZXRhYmxlcyBhbmQgc3RpciBmcnkgZm9yIDMtNCBtaW51dGVzJyxcbiAgICAgICAgICAnQWRkIHNveSBzYXVjZSBhbmQgdG9zcyBldmVyeXRoaW5nIHRvZ2V0aGVyJyxcbiAgICAgICAgICAnU2VydmUgaG90IG92ZXIgcmljZSdcbiAgICAgICAgXSxcbiAgICAgICAgY29va2luZ1RpbWU6IDIwLFxuICAgICAgICBkaWZmaWN1bHR5TGV2ZWw6ICdlYXN5JyxcbiAgICAgICAgc2VydmluZ3M6IDQsXG4gICAgICAgIGRpZXRhcnlUYWdzOiBbJ2Rpbm5lcicsICdhc2lhbicsICdub24tdmVnZXRhcmlhbicsICdxdWljayddLFxuICAgICAgICBpbWFnZVVybDogJ2h0dHBzOi8vaW1hZ2VzLnVuc3BsYXNoLmNvbS9waG90by0xNjA5NTAxNjc2NzI1LTcxODZmMGEwZDBlMT93PTUwMCcsXG4gICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgICB1cGRhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgc291cmNlOiAnVGVzdCBEYXRhJyxcbiAgICAgICAgbnV0cml0aW9uOiB7XG4gICAgICAgICAgY2Fsb3JpZXM6IDM1MCxcbiAgICAgICAgICBwcm90ZWluOiAyOCxcbiAgICAgICAgICBjYXJiczogMTIsXG4gICAgICAgICAgZmF0OiAxOFxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAge1xuICAgICAgICByZWNpcGVJZDogJ3Rlc3QtcmVjaXBlLTInLFxuICAgICAgICB1c2VySWQ6IHRoaXMuU1lTVEVNX1VTRVJfSUQsXG4gICAgICAgIHRpdGxlOiAnVmVnZXRhcmlhbiBQYXN0YScsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnQ3JlYW15IHZlZ2V0YXJpYW4gcGFzdGEgd2l0aCBmcmVzaCB2ZWdldGFibGVzJyxcbiAgICAgICAgaW5ncmVkaWVudHM6IFtcbiAgICAgICAgICB7IG5hbWU6ICdQYXN0YScsIHF1YW50aXR5OiAnNDAwJywgdW5pdDogJ2dyYW0nIH0sXG4gICAgICAgICAgeyBuYW1lOiAnQ2hlcnJ5IFRvbWF0b2VzJywgcXVhbnRpdHk6ICcyMDAnLCB1bml0OiAnZ3JhbScgfSxcbiAgICAgICAgICB7IG5hbWU6ICdGcmVzaCBCYXNpbCcsIHF1YW50aXR5OiAnMjAnLCB1bml0OiAnZ3JhbScgfSxcbiAgICAgICAgICB7IG5hbWU6ICdHYXJsaWMnLCBxdWFudGl0eTogJzInLCB1bml0OiAnY2xvdmUnIH0sXG4gICAgICAgICAgeyBuYW1lOiAnT2xpdmUgT2lsJywgcXVhbnRpdHk6ICczMCcsIHVuaXQ6ICdtaWxsaWxpdGVyJyB9LFxuICAgICAgICAgIHsgbmFtZTogJ1Bhcm1lc2FuIENoZWVzZScsIHF1YW50aXR5OiAnNTAnLCB1bml0OiAnZ3JhbScgfVxuICAgICAgICBdLFxuICAgICAgICBpbnN0cnVjdGlvbnM6IFtcbiAgICAgICAgICAnQ29vayBwYXN0YSBhY2NvcmRpbmcgdG8gcGFja2FnZSBpbnN0cnVjdGlvbnMnLFxuICAgICAgICAgICdIZWF0IG9saXZlIG9pbCBpbiBhIGxhcmdlIHBhbicsXG4gICAgICAgICAgJ0FkZCBnYXJsaWMgYW5kIGNvb2sgdW50aWwgZnJhZ3JhbnQnLFxuICAgICAgICAgICdBZGQgY2hlcnJ5IHRvbWF0b2VzIGFuZCBjb29rIHVudGlsIHRoZXkgYnVyc3QnLFxuICAgICAgICAgICdUb3NzIHdpdGggY29va2VkIHBhc3RhIGFuZCBmcmVzaCBiYXNpbCcsXG4gICAgICAgICAgJ1NlcnZlIHdpdGggZ3JhdGVkIHBhcm1lc2FuIGNoZWVzZSdcbiAgICAgICAgXSxcbiAgICAgICAgY29va2luZ1RpbWU6IDI1LFxuICAgICAgICBkaWZmaWN1bHR5TGV2ZWw6ICdlYXN5JyxcbiAgICAgICAgc2VydmluZ3M6IDQsXG4gICAgICAgIGRpZXRhcnlUYWdzOiBbJ2Rpbm5lcicsICdpdGFsaWFuJywgJ3ZlZ2V0YXJpYW4nLCAncGFzdGEnXSxcbiAgICAgICAgaW1hZ2VVcmw6ICdodHRwczovL2ltYWdlcy51bnNwbGFzaC5jb20vcGhvdG8tMTYyMTk5NjM0NjU2NS1lM2RiYzM1M2QyZTU/dz01MDAnLFxuICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcbiAgICAgICAgdXBkYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICAgIHNvdXJjZTogJ1Rlc3QgRGF0YScsXG4gICAgICAgIG51dHJpdGlvbjoge1xuICAgICAgICAgIGNhbG9yaWVzOiA0MjAsXG4gICAgICAgICAgcHJvdGVpbjogMTUsXG4gICAgICAgICAgY2FyYnM6IDY1LFxuICAgICAgICAgIGZhdDogMTJcbiAgICAgICAgfVxuICAgICAgfVxuICAgIF07XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIHNhdmVSZWNpcGVWMihyZWNpcGU6IFJlY2lwZSk6IFByb21pc2U8dm9pZD4ge1xuICAgIC8vIENyZWF0ZSBhbGwgdGhlIGl0ZW1zIGZvciBzaW5nbGUtdGFibGUgZGVzaWduXG4gICAgY29uc3QgaXRlbXMgPSB0aGlzLmNyZWF0ZVNpbmdsZVRhYmxlSXRlbXMocmVjaXBlKTtcbiAgICBcbiAgICBjb25zb2xlLmxvZyhg8J+TpiBDcmVhdGVkICR7aXRlbXMubGVuZ3RofSBpdGVtcyBmb3IgcmVjaXBlOiAke3JlY2lwZS50aXRsZX1gKTtcbiAgICBcbiAgICAvLyBMb2cgdGhlIHN0cnVjdHVyZSBmb3IgdmVyaWZpY2F0aW9uXG4gICAgY29uc29sZS5sb2coJ/Cfk4sgSXRlbSB0eXBlczonKTtcbiAgICBjb25zdCBpdGVtVHlwZXMgPSBpdGVtcy5yZWR1Y2UoKGFjYywgaXRlbSkgPT4ge1xuICAgICAgYWNjW2l0ZW0uZW50aXR5X3R5cGVdID0gKGFjY1tpdGVtLmVudGl0eV90eXBlXSB8fCAwKSArIDE7XG4gICAgICByZXR1cm4gYWNjO1xuICAgIH0sIHt9IGFzIFJlY29yZDxzdHJpbmcsIG51bWJlcj4pO1xuICAgIGNvbnNvbGUubG9nKGl0ZW1UeXBlcyk7XG4gICAgXG4gICAgLy8gU2F2ZSBhbGwgaXRlbXMgdXNpbmcgYmF0Y2ggd3JpdGVcbiAgICBhd2FpdCB0aGlzLmJhdGNoV3JpdGVJdGVtcyhpdGVtcyk7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVNpbmdsZVRhYmxlSXRlbXMocmVjaXBlOiBSZWNpcGUpOiBhbnlbXSB7XG4gICAgY29uc3QgaXRlbXM6IGFueVtdID0gW107XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIFxuICAgIC8vIDEuIE1haW4gUmVjaXBlIEVudGl0eVxuICAgIGNvbnN0IHJlY2lwZUVudGl0eSA9IHtcbiAgICAgIFBLOiBgUkVDSVBFIyR7cmVjaXBlLnJlY2lwZUlkfWAsXG4gICAgICBTSzogYFJFQ0lQRSMke3JlY2lwZS5yZWNpcGVJZH1gLFxuICAgICAgZW50aXR5X3R5cGU6ICdyZWNpcGUnLFxuICAgICAgdGl0bGU6IHJlY2lwZS50aXRsZSxcbiAgICAgIGRlc2NyaXB0aW9uOiByZWNpcGUuZGVzY3JpcHRpb24sXG4gICAgICBhdXRob3JfaWQ6IGBVU0VSIyR7cmVjaXBlLnVzZXJJZH1gLFxuICAgICAgY3JlYXRlZF9hdDogcmVjaXBlLmNyZWF0ZWRBdCxcbiAgICAgIHVwZGF0ZWRfYXQ6IHJlY2lwZS51cGRhdGVkQXQsXG4gICAgICBjb29raW5nX3RpbWU6IHJlY2lwZS5jb29raW5nVGltZSxcbiAgICAgIGRpZmZpY3VsdHlfbGV2ZWw6IHJlY2lwZS5kaWZmaWN1bHR5TGV2ZWwsXG4gICAgICBzZXJ2aW5nczogcmVjaXBlLnNlcnZpbmdzLFxuICAgICAgaW1hZ2VfdXJsOiByZWNpcGUuaW1hZ2VVcmwsXG4gICAgICBzb3VyY2U6IHJlY2lwZS5zb3VyY2UsXG4gICAgICBzb3VyY2VfdXJsOiByZWNpcGUuc291cmNlVXJsLFxuICAgICAgcmF0aW5nOiByZWNpcGUucmF0aW5nLFxuICAgICAgcmV2aWV3X2NvdW50OiByZWNpcGUucmV2aWV3Q291bnQsXG4gICAgICBudXRyaXRpb246IHJlY2lwZS5udXRyaXRpb24sXG4gICAgICAvLyBHU0kgcHJvamVjdGlvbnNcbiAgICAgIEdTSTFQSzogYEFVVEhPUiMke3JlY2lwZS51c2VySWR9YCxcbiAgICAgIEdTSTFTSzogcmVjaXBlLmNyZWF0ZWRBdFxuICAgIH07XG4gICAgaXRlbXMucHVzaChyZWNpcGVFbnRpdHkpO1xuXG4gICAgLy8gMi4gSW5ncmVkaWVudCBFbnRpdGllcyAob25lIHBlciBpbmdyZWRpZW50IHdpdGggbm9ybWFsaXphdGlvbilcbiAgICBmb3IgKGNvbnN0IGluZ3JlZGllbnQgb2YgcmVjaXBlLmluZ3JlZGllbnRzKSB7XG4gICAgICBjb25zdCBub3JtYWxpemVkID0gY3JlYXRlTm9ybWFsaXplZEluZ3JlZGllbnQoaW5ncmVkaWVudC5uYW1lKTtcbiAgICAgIFxuICAgICAgY29uc29sZS5sb2coYCAg8J+llSBJbmdyZWRpZW50OiBcIiR7aW5ncmVkaWVudC5uYW1lfVwiIOKGkiBcIiR7bm9ybWFsaXplZC5ub3JtYWxpemVkfVwiYCk7XG4gICAgICBjb25zb2xlLmxvZyhgICAgICBWYXJpYXRpb25zOiBbJHtub3JtYWxpemVkLnZhcmlhdGlvbnMuam9pbignLCAnKX1dYCk7XG4gICAgICBcbiAgICAgIC8vIENyZWF0ZSBtYWluIGluZ3JlZGllbnQgZW50aXR5XG4gICAgICBjb25zdCBpbmdyZWRpZW50RW50aXR5ID0ge1xuICAgICAgICBQSzogYFJFQ0lQRSMke3JlY2lwZS5yZWNpcGVJZH1gLFxuICAgICAgICBTSzogYElOR1JFRElFTlQjJHtub3JtYWxpemVkLm5vcm1hbGl6ZWR9YCxcbiAgICAgICAgZW50aXR5X3R5cGU6ICdpbmdyZWRpZW50JyxcbiAgICAgICAgbmFtZTogaW5ncmVkaWVudC5uYW1lLFxuICAgICAgICBub3JtYWxpemVkX25hbWU6IG5vcm1hbGl6ZWQubm9ybWFsaXplZCxcbiAgICAgICAgcXVhbnRpdHk6IGluZ3JlZGllbnQucXVhbnRpdHksXG4gICAgICAgIHVuaXQ6IGluZ3JlZGllbnQudW5pdCxcbiAgICAgICAgLy8gR1NJMyBwcm9qZWN0aW9uXG4gICAgICAgIEdTSTNQSzogYElOR1JFRElFTlQjJHtub3JtYWxpemVkLm5vcm1hbGl6ZWR9YCxcbiAgICAgICAgR1NJM1NLOiBgUkVDSVBFIyR7cmVjaXBlLnJlY2lwZUlkfWBcbiAgICAgIH07XG4gICAgICBpdGVtcy5wdXNoKGluZ3JlZGllbnRFbnRpdHkpO1xuXG4gICAgICAvLyBDcmVhdGUgdmFyaWF0aW9uIGVudGl0aWVzIGZvciBiZXR0ZXIgbWF0Y2hpbmdcbiAgICAgIGZvciAoY29uc3QgdmFyaWF0aW9uIG9mIG5vcm1hbGl6ZWQudmFyaWF0aW9ucykge1xuICAgICAgICBpZiAodmFyaWF0aW9uICE9PSBub3JtYWxpemVkLm5vcm1hbGl6ZWQpIHtcbiAgICAgICAgICBjb25zdCB2YXJpYXRpb25FbnRpdHkgPSB7XG4gICAgICAgICAgICBQSzogYFJFQ0lQRSMke3JlY2lwZS5yZWNpcGVJZH1gLFxuICAgICAgICAgICAgU0s6IGBJTkdSRURJRU5UIyR7dmFyaWF0aW9ufWAsXG4gICAgICAgICAgICBlbnRpdHlfdHlwZTogJ2luZ3JlZGllbnRfdmFyaWF0aW9uJyxcbiAgICAgICAgICAgIG5hbWU6IGluZ3JlZGllbnQubmFtZSxcbiAgICAgICAgICAgIG5vcm1hbGl6ZWRfbmFtZTogbm9ybWFsaXplZC5ub3JtYWxpemVkLFxuICAgICAgICAgICAgdmFyaWF0aW9uOiB2YXJpYXRpb24sXG4gICAgICAgICAgICBxdWFudGl0eTogaW5ncmVkaWVudC5xdWFudGl0eSxcbiAgICAgICAgICAgIHVuaXQ6IGluZ3JlZGllbnQudW5pdCxcbiAgICAgICAgICAgIC8vIEdTSTMgcHJvamVjdGlvblxuICAgICAgICAgICAgR1NJM1BLOiBgSU5HUkVESUVOVCMke3ZhcmlhdGlvbn1gLFxuICAgICAgICAgICAgR1NJM1NLOiBgUkVDSVBFIyR7cmVjaXBlLnJlY2lwZUlkfWBcbiAgICAgICAgICB9O1xuICAgICAgICAgIGl0ZW1zLnB1c2godmFyaWF0aW9uRW50aXR5KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIDMuIFN0ZXAgRW50aXRpZXMgKG9uZSBwZXIgaW5zdHJ1Y3Rpb24pXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCByZWNpcGUuaW5zdHJ1Y3Rpb25zLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCBzdGVwRW50aXR5ID0ge1xuICAgICAgICBQSzogYFJFQ0lQRSMke3JlY2lwZS5yZWNpcGVJZH1gLFxuICAgICAgICBTSzogYFNURVAjJHtpICsgMX1gLFxuICAgICAgICBlbnRpdHlfdHlwZTogJ3N0ZXAnLFxuICAgICAgICBvcmRlcjogaSArIDEsXG4gICAgICAgIGluc3RydWN0aW9uOiByZWNpcGUuaW5zdHJ1Y3Rpb25zW2ldXG4gICAgICB9O1xuICAgICAgaXRlbXMucHVzaChzdGVwRW50aXR5KTtcbiAgICB9XG5cbiAgICAvLyA0LiBUYWcgRW50aXRpZXMgKG9uZSBwZXIgZGlldGFyeSB0YWcpXG4gICAgZm9yIChjb25zdCB0YWcgb2YgcmVjaXBlLmRpZXRhcnlUYWdzKSB7XG4gICAgICBjb25zdCB0YWdFbnRpdHkgPSB7XG4gICAgICAgIFBLOiBgUkVDSVBFIyR7cmVjaXBlLnJlY2lwZUlkfWAsXG4gICAgICAgIFNLOiBgVEFHIyR7dGFnfWAsXG4gICAgICAgIGVudGl0eV90eXBlOiAndGFnJyxcbiAgICAgICAgdGFnOiB0YWcsXG4gICAgICAgIC8vIEdTSTIgcHJvamVjdGlvblxuICAgICAgICBHU0kyUEs6IGBUQUcjJHt0YWd9YCxcbiAgICAgICAgR1NJMlNLOiBgUkVDSVBFIyR7cmVjaXBlLnJlY2lwZUlkfWBcbiAgICAgIH07XG4gICAgICBpdGVtcy5wdXNoKHRhZ0VudGl0eSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGl0ZW1zO1xuICB9XG5cbiAgcHJpdmF0ZSBhc3luYyBiYXRjaFdyaXRlSXRlbXMoaXRlbXM6IGFueVtdKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgLy8gRHluYW1vREIgYmF0Y2ggd3JpdGUgY2FuIGhhbmRsZSB1cCB0byAyNSBpdGVtcyBwZXIgcmVxdWVzdFxuICAgIGNvbnN0IGJhdGNoU2l6ZSA9IDI1O1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpICs9IGJhdGNoU2l6ZSkge1xuICAgICAgY29uc3QgYmF0Y2ggPSBpdGVtcy5zbGljZShpLCBpICsgYmF0Y2hTaXplKTtcbiAgICAgIFxuICAgICAgY29uc3QgcmVxdWVzdEl0ZW1zID0ge1xuICAgICAgICBbdGhpcy5SRUNJUEVTX1RBQkxFXTogYmF0Y2gubWFwKGl0ZW0gPT4gKHtcbiAgICAgICAgICBQdXRSZXF1ZXN0OiB7IEl0ZW06IGl0ZW0gfVxuICAgICAgICB9KSlcbiAgICAgIH07XG5cbiAgICAgIHRyeSB7XG4gICAgICAgIGF3YWl0IGRvY0NsaWVudC5zZW5kKG5ldyBCYXRjaFdyaXRlQ29tbWFuZCh7XG4gICAgICAgICAgUmVxdWVzdEl0ZW1zOiByZXF1ZXN0SXRlbXNcbiAgICAgICAgfSkpO1xuICAgICAgICBjb25zb2xlLmxvZyhg4pyFIFNhdmVkIGJhdGNoICR7TWF0aC5mbG9vcihpIC8gYmF0Y2hTaXplKSArIDF9LyR7TWF0aC5jZWlsKGl0ZW1zLmxlbmd0aCAvIGJhdGNoU2l6ZSl9YCk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGDinYwgRXJyb3Igc2F2aW5nIGJhdGNoOmAsIGVycm9yKTtcbiAgICAgICAgdGhyb3cgZXJyb3I7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8vIFJ1biB0aGUgdGVzdCBpbXBvcnRlciBpZiB0aGlzIGZpbGUgaXMgZXhlY3V0ZWQgZGlyZWN0bHlcbmlmIChyZXF1aXJlLm1haW4gPT09IG1vZHVsZSkge1xuICBjb25zdCBpbXBvcnRlciA9IG5ldyBUZXN0U2luZ2xlVGFibGVJbXBvcnRlcigpO1xuICBpbXBvcnRlci50ZXN0SW1wb3J0KClcbiAgICAudGhlbigoKSA9PiB7XG4gICAgICBjb25zb2xlLmxvZygn8J+OiSBUZXN0IGltcG9ydCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5IScpO1xuICAgICAgcHJvY2Vzcy5leGl0KDApO1xuICAgIH0pXG4gICAgLmNhdGNoKChlcnJvcikgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcign8J+SpSBUZXN0IGltcG9ydCBmYWlsZWQ6JywgZXJyb3IpO1xuICAgICAgcHJvY2Vzcy5leGl0KDEpO1xuICAgIH0pO1xufVxuXG5leHBvcnQgZGVmYXVsdCBUZXN0U2luZ2xlVGFibGVJbXBvcnRlcjtcbiJdfQ==