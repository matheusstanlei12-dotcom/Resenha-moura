package br.com.resenhadomoura

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.Image
import androidx.compose.ui.res.painterResource
import com.example.resenhadomoura.ui.theme.ResenhaDoMouraTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import org.json.JSONArray
import java.net.HttpURLConnection
import java.net.URL
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.graphics.Brush
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.ui.graphics.graphicsLayer

data class Cartao(
    val id: String,
    val nome: String,
    val bandeira: String,
    val banco: String,
    val cor: String
)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ResenhaDoMouraTheme {
                MainAppScreen()
            }
        }
    }
}

const val SUPABASE_URL = "https://bwkzbkabvisqbelocdff.supabase.co"
const val SUPABASE_KEY = "sb_publishable_3dzUU2hGNdPLm1hQHeKJgg_gGGvvjf0"

@Composable
fun MainAppScreen() {
    var userToken by remember { mutableStateOf<String?>(null) }
    
    if (userToken == null) {
        LoginScreen { token -> userToken = token }
    } else {
        GastosScreen(userToken!!)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(onLoginSuccess: (String) -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isSubmitting by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val bgColor = Color(0xFF0f172a)
    val cardColor = Color(0xFF1e293b)
    val accentRed = Color(0xFFef4444)

    Scaffold(containerColor = bgColor) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Image(
                painter = painterResource(id = R.drawable.logo),
                contentDescription = "Logo",
                modifier = Modifier.size(100.dp).padding(bottom = 16.dp).clip(RoundedCornerShape(16.dp))
            )
            Text("Acesso Restrito", fontSize = 28.sp, fontWeight = FontWeight.Black, color = Color.White)
            Text("Faça login como Dono", color = Color.Gray, modifier = Modifier.padding(bottom = 32.dp))

            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                label = { Text("Email", color = Color.Gray) },
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = accentRed, unfocusedBorderColor = cardColor, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                modifier = Modifier.fillMaxWidth().padding(bottom = 16.dp)
            )

            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                label = { Text("Senha", color = Color.Gray) },
                visualTransformation = PasswordVisualTransformation(),
                colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = accentRed, unfocusedBorderColor = cardColor, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                modifier = Modifier.fillMaxWidth().padding(bottom = 32.dp)
            )

            Button(
                onClick = {
                    if (email.isBlank() || password.isBlank()) return@Button
                    isSubmitting = true
                    coroutineScope.launch {
                        try {
                            val token = withContext(Dispatchers.IO) {
                                val url = URL("${SUPABASE_URL}/auth/v1/token?grant_type=password")
                                val conn = url.openConnection() as HttpURLConnection
                                conn.requestMethod = "POST"
                                conn.setRequestProperty("apikey", SUPABASE_KEY)
                                conn.setRequestProperty("Content-Type", "application/json")
                                conn.doOutput = true

                                val json = """{"email": "$email", "password": "$password"}"""
                                conn.outputStream.use { it.write(json.toByteArray()) }

                                if (conn.responseCode in 200..299) {
                                    val response = conn.inputStream.bufferedReader().readText()
                                    JSONObject(response).getString("access_token")
                                } else {
                                    throw Exception("Credenciais inválidas")
                                }
                            }
                            onLoginSuccess(token)
                        } catch (e: Exception) {
                            Toast.makeText(context, e.message, Toast.LENGTH_LONG).show()
                        } finally {
                            isSubmitting = false
                        }
                    }
                },
                colors = ButtonDefaults.buttonColors(containerColor = accentRed),
                modifier = Modifier.fillMaxWidth().height(60.dp),
                shape = RoundedCornerShape(16.dp),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White)
                else Text("Entrar", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = Color.White)
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GastosScreen(token: String) {
    var valor by remember { mutableStateOf("") }
    var descricao by remember { mutableStateOf("") }
    var categoriaSelecionada by remember { mutableStateOf("Fornecedores") }
    var formaPagamento by remember { mutableStateOf("PIX") }
    var cartaoSelecionadoId by remember { mutableStateOf<String?>(null) }
    var cartoes by remember { mutableStateOf<List<Cartao>>(emptyList()) }
    var isSubmitting by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current

    val categorias = listOf(
        Pair("Fornecedores", "🥩"), Pair("Funcionários", "👥"),
        Pair("Contas", "📄"), Pair("Equipamentos", "🔧"),
        Pair("Impostos", "🏛️"), Pair("Outros", "📦")
    )

    val formasPagamento = listOf(
        Pair("PIX", "📱"), Pair("Dinheiro", "💵"),
        Pair("Cartão", "💳"), Pair("Boleto", "📄")
    )

    val bgColor = Color(0xFF020617) // Cor mais profunda
    val cardColor = Color(0xFF1e293b).copy(alpha = 0.7f)
    val accentRed = Color(0xFFef4444)

    var totalGastosMes by remember { mutableStateOf(0.0) }
    var totalReceitaMes by remember { mutableStateOf(0.0) }
    var isLoadingFinance by remember { mutableStateOf(true) }

    // Efeito para carregar cartões e dados financeiros
    LaunchedEffect(Unit) {
        coroutineScope.launch {
            try {
                // 1. Carregar Cartões
                val listCartoes = withContext(Dispatchers.IO) {
                    val url = URL("${SUPABASE_URL}/rest/v1/cartoes_gastos?select=*")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.setRequestProperty("apikey", SUPABASE_KEY)
                    conn.setRequestProperty("Authorization", "Bearer $token")
                    
                    if (conn.responseCode in 200..299) {
                        val response = conn.inputStream.bufferedReader().readText()
                        val array = JSONArray(response)
                        val result = mutableListOf<Cartao>()
                        for (i in 0 until array.length()) {
                            val obj = array.getJSONObject(i)
                            result.add(Cartao(
                                id = obj.getString("id"),
                                nome = obj.getString("nome"),
                                bandeira = obj.getString("bandeira"),
                                banco = obj.optString("banco", ""),
                                cor = obj.optString("cor", "#3b82f6")
                            ))
                        }
                        result
                    } else emptyList()
                }
                cartoes = listCartoes

                // 2. Carregar Resumo Financeiro do Mês
                val cal = java.util.Calendar.getInstance()
                cal.set(java.util.Calendar.DAY_OF_MONTH, 1)
                val sdf = java.text.SimpleDateFormat("yyyy-MM-dd")
                val startOfMonth = sdf.format(cal.time)

                var tReceita = 0.0
                var tGastos = 0.0

                withContext(Dispatchers.IO) {
                    // Pedidos
                    val urlP = URL("${SUPABASE_URL}/rest/v1/pedidos?select=total&status=eq.finalizado&finalizado_at=gte.$startOfMonth")
                    val connP = urlP.openConnection() as HttpURLConnection
                    connP.setRequestProperty("apikey", SUPABASE_KEY)
                    connP.setRequestProperty("Authorization", "Bearer $token")
                    if (connP.responseCode in 200..299) {
                        val arrayP = JSONArray(connP.inputStream.bufferedReader().readText())
                        for (i in 0 until arrayP.length()) {
                            tReceita += arrayP.getJSONObject(i).optDouble("total", 0.0)
                        }
                    }

                    // Gastos
                    val urlG = URL("${SUPABASE_URL}/rest/v1/gastos?select=valor&data_gasto=gte.$startOfMonth")
                    val connG = urlG.openConnection() as HttpURLConnection
                    connG.setRequestProperty("apikey", SUPABASE_KEY)
                    connG.setRequestProperty("Authorization", "Bearer $token")
                    if (connG.responseCode in 200..299) {
                        val arrayG = JSONArray(connG.inputStream.bufferedReader().readText())
                        for (i in 0 until arrayG.length()) {
                            tGastos += arrayG.getJSONObject(i).optDouble("valor", 0.0)
                        }
                    }
                }
                
                totalReceitaMes = tReceita
                totalGastosMes = tGastos
                isLoadingFinance = false

            } catch (e: Exception) {
                e.printStackTrace()
                isLoadingFinance = false
            }
        }
    }

    fun salvarGasto() {
        val valorNumerico = valor.replace(",", ".").toDoubleOrNull()
        if (valorNumerico == null || descricao.isBlank()) {
            Toast.makeText(context, "Preencha corretamente", Toast.LENGTH_SHORT).show()
            return
        }

        if (formaPagamento == "Cartão" && cartaoSelecionadoId == null) {
            Toast.makeText(context, "Selecione o Cartão", Toast.LENGTH_SHORT).show()
            return
        }

        isSubmitting = true

        coroutineScope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val url = URL("${SUPABASE_URL}/rest/v1/gastos")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("apikey", SUPABASE_KEY)
                    conn.setRequestProperty("Authorization", "Bearer $token")
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true

                    val cartaoIdStr = if (cartaoSelecionadoId != null) "\"$cartaoSelecionadoId\"" else "null"
                    val json = """
                        {
                            "descricao": "${descricao.replace("\"", "\\\"")}",
                            "valor": $valorNumerico,
                            "categoria": "$categoriaSelecionada",
                            "forma_pagamento": "$formaPagamento",
                            "cartao_id": $cartaoIdStr
                        }
                    """.trimIndent()

                    conn.outputStream.use { os ->
                        val input = json.toByteArray(Charsets.UTF_8)
                        os.write(input, 0, input.size)
                    }

                    if (conn.responseCode !in 200..299) throw Exception("Erro ao salvar: ${conn.responseCode}")
                }

                Toast.makeText(context, "Gasto Registrado!", Toast.LENGTH_LONG).show()
                valor = ""
                descricao = ""
                cartaoSelecionadoId = null
                formaPagamento = "PIX"

            } catch (e: Exception) {
                Toast.makeText(context, e.message, Toast.LENGTH_LONG).show()
            } finally {
                isSubmitting = false
            }
        }
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = bgColor,
        bottomBar = {
            Button(
                onClick = { salvarGasto() },
                colors = ButtonDefaults.buttonColors(containerColor = accentRed),
                modifier = Modifier.fillMaxWidth().padding(24.dp).height(65.dp).graphicsLayer(shadowElevation = 20f),
                shape = RoundedCornerShape(20.dp),
                enabled = !isSubmitting
            ) {
                if (isSubmitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(24.dp))
                else Text("REGISTRAR AGORA", fontSize = 18.sp, fontWeight = FontWeight.Black, color = Color.White, letterSpacing = 1.sp)
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .background(Brush.verticalGradient(listOf(bgColor, Color(0xFF1e1b4b))))
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("CENTRAL DE COMANDO", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = accentRed, letterSpacing = 2.sp)
            Text("Resumo Financeiro", fontSize = 26.sp, fontWeight = FontWeight.Black, color = Color.White)

            Spacer(modifier = Modifier.height(16.dp))

            if (isLoadingFinance) {
                CircularProgressIndicator(color = accentRed)
                Spacer(modifier = Modifier.height(16.dp))
            } else {
                val lucro = totalReceitaMes - totalGastosMes
                val lucroColor = if (lucro >= 0) Color(0xFF10b981) else accentRed
                Card(
                    colors = CardDefaults.cardColors(containerColor = cardColor),
                    shape = RoundedCornerShape(24.dp),
                    modifier = Modifier.fillMaxWidth().border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(24.dp))
                ) {
                    Column(modifier = Modifier.padding(20.dp).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("LUCRO LÍQUIDO", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = Color.White.copy(alpha = 0.5f))
                        Text(String.format("R$ %.2f", lucro), fontSize = 32.sp, fontWeight = FontWeight.Black, color = lucroColor)
                        
                        Spacer(modifier = Modifier.height(16.dp))
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("RECEITA (MÊS)", fontSize = 10.sp, color = Color.White.copy(alpha = 0.5f))
                                Text(String.format("R$ %.2f", totalReceitaMes), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = Color(0xFFd4af37))
                            }
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text("GASTOS (MÊS)", fontSize = 10.sp, color = Color.White.copy(alpha = 0.5f))
                                Text(String.format("R$ %.2f", totalGastosMes), fontSize = 16.sp, fontWeight = FontWeight.Bold, color = accentRed)
                            }
                        }
                    }
                }
                Spacer(modifier = Modifier.height(32.dp))
            }

            Text("NOVO GASTO", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = accentRed, letterSpacing = 2.sp)
            Text("Gestão de Despesas", fontSize = 22.sp, fontWeight = FontWeight.Black, color = Color.White)

            Spacer(modifier = Modifier.height(24.dp))

            // Card Principal de Valor
            Card(
                colors = CardDefaults.cardColors(containerColor = Color.White.copy(alpha = 0.05f)),
                shape = RoundedCornerShape(32.dp),
                modifier = Modifier.fillMaxWidth().border(1.dp, Color.White.copy(alpha = 0.1f), RoundedCornerShape(32.dp))
            ) {
                Column(modifier = Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("R$", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White.copy(alpha = 0.5f))
                        TextField(
                            value = valor, onValueChange = { valor = it },
                            colors = TextFieldDefaults.colors(focusedContainerColor = Color.Transparent, unfocusedContainerColor = Color.Transparent, focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = accentRed),
                            textStyle = LocalTextStyle.current.copy(fontSize = 56.sp, fontWeight = FontWeight.Black, color = Color.White, textAlign = TextAlign.Center),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                            placeholder = { Text("0,00", fontSize = 56.sp, fontWeight = FontWeight.Black, color = Color.White.copy(alpha = 0.1f)) },
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                    OutlinedTextField(
                        value = descricao, onValueChange = { descricao = it },
                        placeholder = { Text("O que você pagou?", color = Color.Gray) },
                        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = Color.Transparent, unfocusedBorderColor = Color.Transparent, focusedTextColor = Color.White, unfocusedTextColor = Color.White),
                        textStyle = LocalTextStyle.current.copy(textAlign = TextAlign.Center, fontWeight = FontWeight.Medium),
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Seletor de Categoria
            Text("CATEGORIA", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                items(categorias) { cat ->
                    val isSelected = categoriaSelecionada == cat.first
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isSelected) accentRed else Color.White.copy(alpha = 0.05f))
                            .clickable { categoriaSelecionada = cat.first }
                            .padding(horizontal = 16.dp, vertical = 12.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(cat.second, fontSize = 18.sp)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(cat.first, color = Color.White, fontSize = 13.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Forma de Pagamento
            Text("FORMA DE PAGAMENTO", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                formasPagamento.forEach { pg ->
                    val isSelected = formaPagamento == pg.first
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(16.dp))
                            .background(if (isSelected) Color.White.copy(alpha = 0.15f) else Color.White.copy(alpha = 0.05f))
                            .border(1.dp, if (isSelected) Color.White.copy(alpha = 0.3f) else Color.Transparent, RoundedCornerShape(16.dp))
                            .clickable { formaPagamento = pg.first }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(pg.second, fontSize = 20.sp)
                            Text(pg.first, color = Color.White, fontSize = 10.sp, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal)
                        }
                    }
                }
            }

            // Seleção de Cartão (Condicional)
            AnimatedVisibility(
                visible = formaPagamento == "Cartão",
                enter = fadeIn(animationSpec = tween(300)),
                exit = fadeOut(animationSpec = tween(300))
            ) {
                Column(modifier = Modifier.padding(top = 24.dp)) {
                    Text("SELECIONE O CARTÃO", color = Color.White.copy(alpha = 0.4f), fontSize = 10.sp, fontWeight = FontWeight.Bold, modifier = Modifier.fillMaxWidth())
                    Spacer(modifier = Modifier.height(12.dp))
                    if (cartoes.isEmpty()) {
                        Text("Nenhum cartão cadastrado no site.", color = Color.Gray, fontSize = 12.sp)
                    } else {
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            items(cartoes) { cartao ->
                                val isSelected = cartaoSelecionadoId == cartao.id
                                val cardBg = try { Color(android.graphics.Color.parseColor(cartao.cor)) } catch(e: Exception) { Color(0xFF3b82f6) }
                                
                                Box(
                                    modifier = Modifier
                                        .width(160.dp)
                                        .height(90.dp)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(Brush.linearGradient(listOf(cardBg, cardBg.copy(alpha = 0.6f))))
                                        .border(if (isSelected) 3.dp else 0.dp, Color.White, RoundedCornerShape(16.dp))
                                        .clickable { cartaoSelecionadoId = cartao.id }
                                        .padding(12.dp)
                                ) {
                                    Column(modifier = Modifier.fillMaxSize(), verticalArrangement = Arrangement.SpaceBetween) {
                                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                            Text(cartao.bandeira, color = Color.White, fontSize = 10.sp, fontWeight = FontWeight.Black)
                                            if (isSelected) Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                        }
                                        Column {
                                            Text(cartao.nome, color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Bold)
                                            if (cartao.banco.isNotBlank()) {
                                                Text(cartao.banco, color = Color.White.copy(alpha = 0.7f), fontSize = 9.sp)
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}